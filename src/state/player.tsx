import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { Episode, podcast } from '@/content/sample';

/**
 * Shared "now playing" state so the podcast list, the mini player and the
 * full player screen stay in step.
 *
 * This holds UI state only. Real audio playback (expo-audio, with background
 * play and lock-screen controls) is wired in a later step.
 */
type PlayerState = {
  episode: Episode;
  playing: boolean;
  speed: number;
  play: (episode: Episode) => void;
  toggle: () => void;
  cycleSpeed: () => void;
};

const SPEEDS = [1, 1.25, 1.5, 2, 0.75];

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [episode, setEpisode] = useState<Episode>(podcast.episodes[0]);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);

  const value = useMemo<PlayerState>(
    () => ({
      episode,
      playing,
      speed: SPEEDS[speedIndex],
      play: (next) => {
        if (next.id === episode.id) setPlaying((p) => !p);
        else {
          setEpisode(next);
          setPlaying(true);
        }
      },
      toggle: () => setPlaying((p) => !p),
      cycleSpeed: () => setSpeedIndex((i) => (i + 1) % SPEEDS.length),
    }),
    [episode, playing, speedIndex],
  );

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
