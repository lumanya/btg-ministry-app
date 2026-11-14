import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { podcast as samplePodcast } from '@/content/sample';
import { Episode, parsePodcastRss, Podcast } from '@/lib/podcast';

/**
 * The podcast: its episodes (from the RSS feed) and the audio player.
 *
 * Set EXPO_PUBLIC_PODCAST_FEED_URL in `.env` to the podcast's RSS feed.
 * Without it the app lists the sample episodes, which have no audio yet.
 *
 * Listening position is saved on the phone, so episodes resume where the
 * listener stopped and Home can offer "Continue listening".
 */
const FEED_URL = process.env.EXPO_PUBLIC_PODCAST_FEED_URL;
const STORAGE_KEY = 'btg.podcast.progress.v1';
const SPEEDS = [1, 1.25, 1.5, 2, 0.75];
const SLEEP_MS = 30 * 60 * 1000;
const SAVE_EVERY_S = 10;
const ARTIST = 'Iman Mwakanyamale';

type Saved = { position: number; duration: number; finished: boolean; at: number };
type Store = { last: string | null; episodes: Record<string, Saved>; lastEpisode: Episode | null };

export type PodcastStatus = 'sample' | 'loading' | 'ready' | 'error';

type PlayerState = {
  podcast: Podcast;
  status: PodcastStatus;
  refresh: () => Promise<void>;
  /** The episode in the player, if any. */
  episode: Episode | null;
  playing: boolean;
  buffering: boolean;
  position: number;
  duration: number;
  speed: number;
  sleepOn: boolean;
  /** Episode chosen has no recording (sample content). */
  unavailable: boolean;
  play: (episode: Episode) => void;
  toggle: () => void;
  seekTo: (seconds: number) => void;
  skip: (deltaSeconds: number) => void;
  next: (step: 1 | -1) => void;
  cycleSpeed: () => void;
  toggleSleep: () => void;
  saved: (id: string) => Saved | undefined;
  /** The last episode played and where it stopped, for "Continue listening". */
  resume: { episode: Episode; position: number; duration: number } | null;
};

const sample: Podcast = {
  title: samplePodcast.name,
  description: samplePodcast.description,
  artwork: null,
  episodes: samplePodcast.episodes.map((e) => ({
    id: e.id,
    title: e.title,
    description: '',
    audioUrl: null,
    duration: null,
    date: null,
    artwork: null,
    series: e.series,
  })),
};

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const [podcast, setPodcast] = useState<Podcast>(sample);
  const [feedStatus, setFeedStatus] = useState<PodcastStatus>(FEED_URL ? 'loading' : 'sample');
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [sleepOn, setSleepOn] = useState(false);
  const [store, setStore] = useState<Store>({ last: null, episodes: {}, lastEpisode: null });

  const pendingSeek = useRef<number | null>(null);
  const lastSaved = useRef(0);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const episodeRef = useRef<Episode | null>(null);
  const speedRef = useRef(SPEEDS[0]);

  /* ---------- setup ---------- */

  useEffect(() => {
    // Keep playing with the screen locked and in silent mode; show lock-screen controls.
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch((e) =>
      console.warn('Audio mode', e),
    );
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setStore((s) => ({ ...s, ...(JSON.parse(raw) as Partial<Store>) })))
      .catch(() => {});
    return () => {
      if (sleepTimer.current) clearTimeout(sleepTimer.current);
    };
  }, []);

  const loadFeed = useCallback(async () => {
    if (!FEED_URL) return;
    try {
      const res = await fetch(FEED_URL);
      if (!res.ok) throw new Error(`Podcast feed returned ${res.status}`);
      const parsed = parsePodcastRss(await res.text());
      if (parsed.episodes.length === 0) throw new Error('Podcast feed has no episodes');
      setPodcast(parsed);
      setFeedStatus('ready');
    } catch (err) {
      console.warn('Could not load the podcast feed', err);
      setFeedStatus((s) => (s === 'ready' ? s : 'error'));
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadFeed, 0);
    return () => clearTimeout(t);
  }, [loadFeed]);

  /* ---------- saving progress ---------- */

  const persist = useCallback((update: (s: Store) => Store) => {
    setStore((s) => {
      const next = update(s);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const savePosition = useCallback(
    (ep: Episode, position: number, duration: number, finished = false) => {
      persist((s) => ({
        last: ep.id,
        lastEpisode: ep,
        episodes: { ...s.episodes, [ep.id]: { position: finished ? 0 : position, duration, finished, at: Date.now() } },
      }));
    },
    [persist],
  );

  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      const ep = episodeRef.current;
      if (!ep) return;
      if (s.isLoaded && pendingSeek.current !== null) {
        const to = pendingSeek.current;
        pendingSeek.current = null;
        player.seekTo(to).catch(() => {});
      }
      // A speed set before the episode loaded can be dropped; apply it again.
      if (s.isLoaded && s.playing && Math.abs(s.playbackRate - speedRef.current) > 0.01) {
        player.setPlaybackRate(speedRef.current);
      }
      if (s.didJustFinish) {
        savePosition(ep, 0, s.duration, true);
        return;
      }
      if (Math.abs(s.currentTime - lastSaved.current) >= SAVE_EVERY_S || (!s.playing && s.currentTime > 0 && s.currentTime !== lastSaved.current)) {
        lastSaved.current = s.currentTime;
        savePosition(ep, s.currentTime, s.duration);
      }
    });
    return () => sub.remove();
  }, [player, savePosition]);

  /* ---------- controls ---------- */

  const speed = SPEEDS[speedIndex];

  const play = useCallback(
    (ep: Episode) => {
      const current = episodeRef.current;
      if (current?.id === ep.id && ep.audioUrl) {
        if (player.playing) player.pause();
        else player.play();
        return;
      }
      episodeRef.current = ep;
      setEpisode(ep);
      if (!ep.audioUrl) {
        player.pause();
        return;
      }
      const saved = store.episodes[ep.id];
      pendingSeek.current = saved && !saved.finished && saved.position > 5 ? saved.position : null;
      lastSaved.current = pendingSeek.current ?? 0;
      player.replace({ uri: ep.audioUrl });
      player.setPlaybackRate(speed);
      player.play();
      player.setActiveForLockScreen(
        true,
        { title: ep.title, artist: ARTIST, albumTitle: podcast.title, artworkUrl: ep.artwork ?? podcast.artwork ?? undefined },
        { showSeekBackward: true, showSeekForward: true },
      );
      persist((s) => ({ ...s, last: ep.id, lastEpisode: ep }));
    },
    [player, store.episodes, speed, podcast.title, podcast.artwork, persist],
  );

  const value = useMemo<PlayerState>(() => {
    const unavailable = !!episode && !episode.audioUrl;
    const lastEp = store.lastEpisode ?? podcast.episodes.find((e) => e.id === store.last) ?? null;
    const lastSavedPos = lastEp ? store.episodes[lastEp.id] : undefined;
    const isCurrent = !!episode && !!lastEp && episode.id === lastEp.id && !unavailable;
    return {
      podcast,
      status: feedStatus,
      refresh: loadFeed,
      episode,
      playing: status.playing && !unavailable,
      buffering: status.isBuffering,
      position: unavailable ? 0 : status.currentTime,
      duration: unavailable ? episode?.duration ?? 0 : status.duration || episode?.duration || 0,
      speed,
      sleepOn,
      unavailable,
      play,
      toggle: () => {
        if (!episode) {
          const first = lastEp ?? podcast.episodes[0];
          if (first) play(first);
          return;
        }
        if (unavailable) return;
        if (player.playing) player.pause();
        else player.play();
      },
      seekTo: (seconds) => {
        if (!unavailable) player.seekTo(Math.max(0, seconds)).catch(() => {});
      },
      skip: (delta) => {
        if (!unavailable) player.seekTo(Math.max(0, Math.min(player.currentTime + delta, player.duration || Infinity))).catch(() => {});
      },
      next: (step) => {
        const list = podcast.episodes;
        if (!list.length) return;
        const i = episode ? list.findIndex((e) => e.id === episode.id) : -1;
        play(list[(i + step + list.length) % list.length]);
      },
      cycleSpeed: () => {
        const i = (speedIndex + 1) % SPEEDS.length;
        setSpeedIndex(i);
        speedRef.current = SPEEDS[i];
        player.setPlaybackRate(SPEEDS[i]);
      },
      toggleSleep: () => {
        if (sleepTimer.current) clearTimeout(sleepTimer.current);
        sleepTimer.current = null;
        if (!sleepOn) {
          sleepTimer.current = setTimeout(() => {
            player.pause();
            setSleepOn(false);
          }, SLEEP_MS);
        }
        setSleepOn(!sleepOn);
      },
      saved: (id) => store.episodes[id],
      resume: lastEp
        ? {
            episode: lastEp,
            position: isCurrent ? status.currentTime : lastSavedPos?.position ?? 0,
            duration: (isCurrent ? status.duration : 0) || lastSavedPos?.duration || lastEp.duration || 0,
          }
        : null,
    };
  }, [podcast, feedStatus, loadFeed, episode, status, speed, speedIndex, sleepOn, play, player, store]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}

export function formatSpeed(speed: number) {
  return `${speed}×`;
}
