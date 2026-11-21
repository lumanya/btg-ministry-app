import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { dayKey } from '@/lib/streak';

/**
 * Today's rhythm: three small steps with the Word — read today's devotional
 * (tracked by the library), watch a seed, and pray.
 *
 * Also keeps each member's private reflections on devotionals. All of this
 * stays on the phone only; reflections are never sent anywhere.
 */
const STORAGE_KEY = 'btg.rhythm.v1';
/** Days kept for seeds and prayer (enough for a few weeks of history). */
const KEEP_DAYS = 60;

type Stored = {
  seedDays: string[];
  prayDays: string[];
  /** devotional id -> the member's own words */
  reflections: Record<string, string>;
};

const empty: Stored = { seedDays: [], prayDays: [], reflections: {} };

type RhythmState = {
  seedToday: boolean;
  prayedToday: boolean;
  markSeed: () => void;
  markPrayed: () => void;
  reflection: (devotionalId: string) => string;
  setReflection: (devotionalId: string, text: string) => void;
};

const RhythmContext = createContext<RhythmState | null>(null);

function addDay(list: string[], day: string) {
  return list.includes(day) ? list : [day, ...list].slice(0, KEEP_DAYS);
}

export function RhythmProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Stored>(empty);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setData({ ...empty, ...(JSON.parse(raw) as Partial<Stored>) }))
      .catch(() => {});
  }, []);

  const update = useCallback((fn: (d: Stored) => Stored) => {
    setData((d) => {
      const next = fn(d);
      if (next !== d) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<RhythmState>(() => {
    const today = dayKey();
    return {
      seedToday: data.seedDays.includes(today),
      prayedToday: data.prayDays.includes(today),
      markSeed: () => update((d) => (d.seedDays.includes(dayKey()) ? d : { ...d, seedDays: addDay(d.seedDays, dayKey()) })),
      markPrayed: () => update((d) => (d.prayDays.includes(dayKey()) ? d : { ...d, prayDays: addDay(d.prayDays, dayKey()) })),
      reflection: (id) => data.reflections[id] ?? '',
      setReflection: (id, text) =>
        update((d) => {
          const reflections = { ...d.reflections };
          if (text) reflections[id] = text.slice(0, 2000);
          else delete reflections[id];
          return { ...d, reflections };
        }),
    };
  }, [data, update]);

  return <RhythmContext.Provider value={value}>{children}</RhythmContext.Provider>;
}

export function useRhythm() {
  const ctx = useContext(RhythmContext);
  if (!ctx) throw new Error('useRhythm must be used inside RhythmProvider');
  return ctx;
}
