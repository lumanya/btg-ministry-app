import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { sampleVideos } from '@/content/sample';
import { arrangePlaylists } from '@/lib/content';
import { type Feed, type FeedPlaylist, type FeedVideo, findVideo as findInFeed, type PlaylistPage } from '@/lib/video';
import { useContent } from '@/state/content';

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
  /** The channel's playlists, as staff arranged them in the dashboard. */
  playlists: FeedPlaylist[];
  /** One page of a playlist (50 videos), in the order arranged on YouTube. */
  loadPlaylist: (id: string, pageToken?: string | null) => Promise<PlaylistPage>;
  /** Finds a video in the feed or in any playlist page loaded so far. */
  findVideo: (id: string) => FeedVideo | undefined;
  /** The videos of a playlist loaded so far, in order. */
  playlistVideos: (id: string) => FeedVideo[];
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
  const content = useContent();
  // Videos seen in playlist pages, so their sermon pages open without the main feed.
  const [seen, setSeen] = useState<Record<string, FeedVideo>>({});
  const [orders, setOrders] = useState<Record<string, string[]>>({});

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

  const loadPlaylist = useCallback(async (id: string, pageToken?: string | null): Promise<PlaylistPage> => {
    if (!FEED_URL) return { playlist: null, videos: [], nextPageToken: null };
    const url = `${FEED_URL}?playlist=${encodeURIComponent(id)}${pageToken ? `&page=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Playlist returned ${res.status}`);
    const page = (await res.json()) as PlaylistPage;
    if (!Array.isArray(page.videos)) throw new Error('Playlist has an unexpected shape');
    setSeen((s) => {
      const next = { ...s };
      for (const v of page.videos) next[v.id] = v;
      return next;
    });
    setOrders((o) => ({ ...o, [id]: [...(pageToken ? (o[id] ?? []) : []), ...page.videos.map((v) => v.id)] }));
    return page;
  }, []);

  const playlists = useMemo(() => arrangePlaylists(feed.playlists ?? [], content.playlistSettings), [feed.playlists, content.playlistSettings]);

  const value = useMemo(
    () => ({
      feed,
      status,
      refreshing,
      refresh,
      playlists,
      loadPlaylist,
      findVideo: (id: string) => findInFeed(feed, id) ?? seen[id],
      playlistVideos: (id: string) => (orders[id] ?? []).map((v) => seen[v]).filter((v): v is FeedVideo => !!v),
    }),
    [feed, status, refreshing, refresh, playlists, loadPlaylist, seen, orders],
  );
  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeed() {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error('useFeed must be used inside FeedProvider');
  return ctx;
}
