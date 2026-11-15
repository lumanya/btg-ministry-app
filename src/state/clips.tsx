import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { Clip } from '@/lib/clips';

/**
 * Clips: the ministry's short Instagram videos, read through the instagram-feed
 * server function. The list (not the videos) is kept on the phone so Home can show
 * the row straight away; video links expire, so it is fetched again when needed.
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const CLIPS_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/instagram-feed` : null;
const CACHE_KEY = 'btg.clips.v1';
/** Fetch again when older than this (Instagram video links stop working after a while). */
const FRESH_MS = 10 * 60 * 1000;

type ClipsState = {
  clips: Clip[];
  /** off: no server set up; loading: first fetch; ready; error: couldn't load (showing any saved list). */
  status: 'off' | 'loading' | 'ready' | 'error';
  /** Fetches the list again unless it is fresh (or always, with `force`). */
  refresh: (force?: boolean) => Promise<void>;
};

const ClipsContext = createContext<ClipsState | null>(null);

export function ClipsProvider({ children }: { children: ReactNode }) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [status, setStatus] = useState<ClipsState['status']>(CLIPS_URL ? 'loading' : 'off');
  const fetchedAt = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);

  const load = useCallback(async () => {
    if (!CLIPS_URL) return;
    try {
      const res = await fetch(CLIPS_URL);
      const body = (await res.json()) as { clips?: Clip[] };
      if (!res.ok || !Array.isArray(body.clips)) throw new Error(`Clips returned ${res.status}`);
      fetchedAt.current = Date.now();
      setClips(body.clips);
      setStatus('ready');
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(body.clips)).catch(() => {});
    } catch (err) {
      console.warn('Could not load clips', err);
      setStatus((s) => (s === 'ready' ? s : 'error'));
    }
  }, []);

  const refresh = useCallback(
    async (force = false) => {
      if (!force && Date.now() - fetchedAt.current < FRESH_MS) return;
      inFlight.current ??= load().finally(() => {
        inFlight.current = null;
      });
      await inFlight.current;
    },
    [load],
  );

  useEffect(() => {
    if (!CLIPS_URL) return;
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (raw) setClips((c) => (c.length ? c : (JSON.parse(raw) as Clip[])));
      })
      .catch(() => {})
      .finally(() => refresh(true));
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const value = useMemo(() => ({ clips, status, refresh }), [clips, status, refresh]);
  return <ClipsContext.Provider value={value}>{children}</ClipsContext.Provider>;
}

export function useClips() {
  const ctx = useContext(ClipsContext);
  if (!ctx) throw new Error('useClips must be used inside ClipsProvider');
  return ctx;
}
