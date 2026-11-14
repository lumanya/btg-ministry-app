import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { currentStreak, dayKey, longestStreak, weekProgress } from '@/lib/streak';
import type { FeedVideo } from '@/lib/video';

/**
 * What a member has read and saved, kept on the phone.
 *
 * - Reading history drives the streak on Home and the Devotional tab.
 * - Saved sermons and devotionals appear under Saved.
 *
 * This lives on the device for now; once accounts sync is added it will
 * also be saved to the member's account.
 */
const STORAGE_KEY = 'btg.library.v1';

type Stored = {
  /** devotional id -> the day (YYYY-MM-DD) it was marked as read */
  read: Record<string, string>;
  savedDevotionals: string[];
  /** Saved sermons keep a copy of the video so they still list when the feed changes. */
  savedVideos: FeedVideo[];
};

const empty: Stored = { read: {}, savedDevotionals: [], savedVideos: [] };

type LibraryState = {
  ready: boolean;
  streak: number;
  bestStreak: number;
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

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Stored>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setData({ ...empty, ...(JSON.parse(raw) as Partial<Stored>) }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((fn: (d: Stored) => Stored) => {
    setData((d) => {
      const next = fn(d);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<LibraryState>(() => {
    const days = Object.values(data.read);
    const today = dayKey();
    return {
      ready,
      streak: currentStreak(days, today),
      bestStreak: longestStreak(days),
      readToday: days.includes(today),
      week: weekProgress(days, today),
      isRead: (id) => id in data.read,
      markRead: (id) => update((d) => (id in d.read ? d : { ...d, read: { ...d.read, [id]: dayKey() } })),
      unmarkRead: (id) =>
        update((d) => {
          const read = { ...d.read };
          delete read[id];
          return { ...d, read };
        }),
      savedDevotionals: data.savedDevotionals,
      savedVideos: data.savedVideos,
      isDevotionalSaved: (id) => data.savedDevotionals.includes(id),
      isVideoSaved: (id) => data.savedVideos.some((v) => v.id === id),
      toggleDevotional: (id) =>
        update((d) => ({
          ...d,
          savedDevotionals: d.savedDevotionals.includes(id) ? d.savedDevotionals.filter((x) => x !== id) : [id, ...d.savedDevotionals],
        })),
      toggleVideo: (video) =>
        update((d) => ({
          ...d,
          savedVideos: d.savedVideos.some((v) => v.id === video.id) ? d.savedVideos.filter((v) => v.id !== video.id) : [video, ...d.savedVideos],
        })),
    };
  }, [data, ready, update]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
