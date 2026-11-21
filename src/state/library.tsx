import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { compactVideo, emptyLibrary, mergeOnSignIn, ReadRow, SavedRow, Stored } from '@/lib/library-sync';
import { dayKey, longestStreak, streakInfo, weekProgress } from '@/lib/streak';
import { supabase } from '@/lib/supabase';
import type { FeedVideo } from '@/lib/video';
import { useAuth } from '@/state/auth';

/**
 * What a member has read and saved.
 *
 * - Reading history drives the streak on Home and the Devotional tab.
 * - Saved sermons and devotionals appear under Saved.
 *
 * Always kept on the phone. When a member is signed in it is also saved to their
 * account (reading_log and saved_items in Supabase), so it follows them to a new phone.
 */
const STORAGE_KEY = 'btg.library.v1';

type LibraryState = {
  ready: boolean;
  streak: number;
  bestStreak: number;
  /** This week's grace day is unused: one missed day won't break the streak. */
  graceReady: boolean;
  readToday: boolean;
  week: ReturnType<typeof weekProgress>;
  isRead: (devotionalId: string) => boolean;
  markRead: (devotionalId: string) => void;
  unmarkRead: (devotionalId: string) => void;
  savedDevotionals: string[];
  savedVideos: FeedVideo[];
  isDevotionalSaved: (id: string) => boolean;
  isVideoSaved: (id: string) => boolean;
  toggleDevotional: (id: string) => void;
  toggleVideo: (video: FeedVideo) => void;
};

const LibraryContext = createContext<LibraryState | null>(null);

/** Writes to the account in the background; the phone copy is the source of truth until the next sign-in merge. */
function remote(run: () => PromiseLike<{ error: unknown }> | undefined) {
  Promise.resolve(run())
    .then((r) => r?.error && console.warn('Library sync failed', r.error))
    .catch(() => {});
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const uid = auth.session?.user.id ?? null;
  const [data, setData] = useState<Stored>(emptyLibrary);
  const [ready, setReady] = useState(false);
  const syncedFor = useRef<string | null>(null);
  const latest = useRef<Stored>(emptyLibrary);
  useEffect(() => {
    latest.current = data;
  }, [data]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setData({ ...emptyLibrary, ...(JSON.parse(raw) as Partial<Stored>) }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const save = useCallback((next: Stored) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const update = useCallback(
    (fn: (d: Stored) => Stored) => {
      setData((d) => {
        const next = fn(d);
        save(next);
        return next;
      });
    },
    [save],
  );

  // Signing in: merge with the account. Signing out: clear the account's data off the phone.
  useEffect(() => {
    if (!ready || !auth.ready) return;
    if (!uid) {
      syncedFor.current = null;
      if (data.owner) {
        const t = setTimeout(() => update(() => emptyLibrary), 0);
        return () => clearTimeout(t);
      }
      return;
    }
    if (!supabase || syncedFor.current === uid) return;
    syncedFor.current = uid;
    const client = supabase;
    let cancelled = false;
    (async () => {
      const [reads, saved] = await Promise.all([
        client.from('reading_log').select('devotional_slug,read_on'),
        client.from('saved_items').select('kind,item_id,data').order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      if (reads.error || saved.error) {
        // Try again next time the app opens.
        syncedFor.current = null;
        return;
      }
      const merged = mergeOnSignIn(latest.current, reads.data as ReadRow[], saved.data as SavedRow[], uid);
      setData(merged.next);
      save(merged.next);
      if (merged.uploadReads.length) await client.from('reading_log').upsert(merged.uploadReads);
      if (merged.uploadSaved.length) await client.from('saved_items').upsert(merged.uploadSaved);
    })().catch(() => {
      syncedFor.current = null;
    });
    return () => {
      cancelled = true;
    };
  }, [uid, ready, auth.ready, data.owner, update, save]);

  const value = useMemo<LibraryState>(() => {
    const days = Object.values(data.read);
    const today = dayKey();
    const client = uid ? supabase : null;
    const run = streakInfo(days, today);
    return {
      ready,
      streak: run.count,
      bestStreak: longestStreak(days),
      graceReady: run.graceReady,
      readToday: days.includes(today),
      week: weekProgress(days, today, run.graced),
      isRead: (id) => id in data.read,
      markRead: (id) => {
        if (id in data.read) return;
        const day = dayKey();
        update((d) => ({ ...d, read: { ...d.read, [id]: day }, owner: uid }));
        remote(() => client?.from('reading_log').upsert({ devotional_slug: id, read_on: day }));
      },
      unmarkRead: (id) => {
        update((d) => {
          const read = { ...d.read };
          delete read[id];
          return { ...d, read };
        });
        remote(() => client?.from('reading_log').delete().eq('devotional_slug', id));
      },
      savedDevotionals: data.savedDevotionals,
      savedVideos: data.savedVideos,
      isDevotionalSaved: (id) => data.savedDevotionals.includes(id),
      isVideoSaved: (id) => data.savedVideos.some((v) => v.id === id),
      toggleDevotional: (id) => {
        const saved = data.savedDevotionals.includes(id);
        update((d) => ({
          ...d,
          owner: uid,
          savedDevotionals: saved ? d.savedDevotionals.filter((x) => x !== id) : [id, ...d.savedDevotionals.filter((x) => x !== id)],
        }));
        remote(() =>
          saved
            ? client?.from('saved_items').delete().match({ kind: 'devotional', item_id: id })
            : client?.from('saved_items').upsert({ kind: 'devotional', item_id: id, data: null }),
        );
      },
      toggleVideo: (video) => {
        const saved = data.savedVideos.some((v) => v.id === video.id);
        update((d) => ({
          ...d,
          owner: uid,
          savedVideos: saved ? d.savedVideos.filter((v) => v.id !== video.id) : [compactVideo(video), ...d.savedVideos.filter((v) => v.id !== video.id)],
        }));
        remote(() =>
          saved
            ? client?.from('saved_items').delete().match({ kind: 'video', item_id: video.id })
            : client?.from('saved_items').upsert({ kind: 'video', item_id: video.id, data: compactVideo(video) }),
        );
      },
    };
  }, [data, ready, uid, update]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
