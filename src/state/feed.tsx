import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { sampleVideos } from '@/content/sample';
import type { Feed } from '@/lib/video';

/**
 * The YouTube feed: what is live, what is coming up, and past sermons.
 *
 * It is read from the `youtube-feed` server function (supabase/functions).
 * Set EXPO_PUBLIC_YOUTUBE_FEED_URL in `.env` to switch it on; without it the
 * app shows the sample videos in src/content/sample.ts.
 */
const FEED_URL = process.env.EXPO_PUBLIC_YOUTUBE_FEED_URL;
const REFRESH_MS = 5 * 60 * 1000;
const LIVE_REFRESH_MS = 60 * 1000;

export type FeedStatus = 'sample' | 'loading' | 'ready' | 'error';

type FeedState = {
  feed: Feed;
  status: FeedStatus;
  refreshing: boolean;
  refresh: () => Promise<void>;
};

const sampleFeed: Feed = {
  channelId: 'UC0wRGjSLCWbmVqMfvX3PIiw',
  live: null,
  upcoming: [],
  videos: sampleVideos,
  fetchedAt: new Date(0).toISOString(),
};

const FeedContext = createContext<FeedState | null>(null);

export function FeedProvider({ children }: { children: ReactNode }) {
  const [feed, setFeed] = useState<Feed>(sampleFeed);
  const [status, setStatus] = useState<FeedStatus>(FEED_URL ? 'loading' : 'sample');
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (!FEED_URL || inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(FEED_URL);
      if (!res.ok) throw new Error(`Feed returned ${res.status}`);
      const next = (await res.json()) as Feed;
      if (!Array.isArray(next.videos)) throw new Error('Feed has an unexpected shape');
      setFeed(next);
      setStatus('ready');
    } catch (err) {
      console.warn('Could not load the YouTube feed', err);
      // Keep whatever was shown last; only flag an error if nothing real loaded.
      setStatus((s) => (s === 'ready' ? s : 'error'));
    } finally {
      inFlight.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Load on start, then poll: every minute while live, every 5 minutes otherwise.
  const isLive = !!feed.live;
  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, isLive ? LIVE_REFRESH_MS : REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load, isLive]);

  // Refresh when the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  const value = useMemo(() => ({ feed, status, refreshing, refresh }), [feed, status, refreshing, refresh]);
  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeed() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error('useFeed must be used inside FeedProvider');
  return ctx;
}
