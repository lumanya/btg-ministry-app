import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import * as sample from '@/content/sample';
import type { Devotional } from '@/content/sample';
import {
  DEVOTIONAL_COLUMNS,
  DevotionalRow,
  GivingMethod,
  GivingRow,
  mapDevotional,
  mapGiving,
  mapSeries,
  mapService,
  Series,
  Service,
  ServiceRow,
} from '@/lib/content';
import { supabase } from '@/lib/supabase';

/**
 * Devotionals, series, weekly services, giving details and quotes.
 *
 * With Supabase connected these come from the database (posted from the admin
 * dashboard) and a copy is kept on the phone for offline use. Without it, the
 * built-in sample content is shown.
 */
const CACHE_KEY = 'btg.content.v1';
/** Check for new content when the app comes back to the front, at most this often. */
const REFRESH_AFTER_MS = 15 * 60 * 1000;

type Snapshot = {
  devotionals: Devotional[];
  series: Series[];
  services: Service[];
  giving: GivingMethod[];
  quotes: string[];
};

export type PrayerInput = { message: string; name?: string; contact?: string };

type ContentState = Snapshot & {
  /** sample: no backend; loading: first fetch, nothing cached; live: from Supabase; offline: showing the saved copy. */
  status: 'sample' | 'loading' | 'live' | 'offline';
  refreshing: boolean;
  refresh: () => Promise<void>;
  /** Today's devotional (the newest one published up to today). */
  today: Devotional;
  findDevotional: (id: string) => Devotional | undefined;
  /** Sends a prayer request to the ministry. Throws an Error with a message to show. */
  sendPrayer: (input: PrayerInput) => Promise<void>;
};

const sampleSnapshot: Snapshot = {
  devotionals: sample.devotionals,
  series: sample.podcast.series,
  services: sample.services,
  giving: sample.giving,
  quotes: sample.quotes,
};

const ContentContext = createContext<ContentState | null>(null);

async function fetchSnapshot(): Promise<Snapshot> {
  if (!supabase) throw new Error('Not connected');
  const [devotionals, series, services, giving, quotes] = await Promise.all([
    supabase.from('devotionals').select(DEVOTIONAL_COLUMNS).order('publish_on', { ascending: false }).limit(90),
    supabase.from('series').select('name,tone').order('sort').order('name'),
    supabase.from('services').select('id,name,weekday,start_time,venue,livestreamed').order('sort').order('weekday'),
    supabase.from('giving_methods').select('id,label,number,account_name').order('sort'),
    supabase.from('quotes').select('text').order('created_at'),
  ]);
  const failed = [devotionals, series, services, giving, quotes].find((r) => r.error);
  if (failed?.error) throw failed.error;
  return {
    devotionals: ((devotionals.data ?? []) as unknown as DevotionalRow[]).map(mapDevotional),
    series: (series.data ?? []).map(mapSeries),
    services: ((services.data ?? []) as ServiceRow[]).map(mapService),
    giving: ((giving.data ?? []) as GivingRow[]).map(mapGiving),
    quotes: (quotes.data ?? []).map((q: { text: string }) => q.text),
  };
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(sampleSnapshot);
  const [status, setStatus] = useState<ContentState['status']>(supabase ? 'loading' : 'sample');
  const [refreshing, setRefreshing] = useState(false);
  const lastFetch = useRef(0);

  const load = useCallback(async () => {
    if (!supabase) return;
    try {
      const fresh = await fetchSnapshot();
      lastFetch.current = Date.now();
      setSnapshot(fresh);
      setStatus('live');
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fresh)).catch(() => {});
    } catch {
      setStatus((s) => (s === 'live' ? 'live' : 'offline'));
    }
  }, []);

  // Show the saved copy straight away, then fetch the latest.
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (!cancelled && raw) {
          setSnapshot({ ...sampleSnapshot, ...(JSON.parse(raw) as Partial<Snapshot>) });
          setStatus((s) => (s === 'loading' ? 'offline' : s));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) load();
      });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastFetch.current > REFRESH_AFTER_MS) load();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const sendPrayer = useCallback(async ({ message, name, contact }: PrayerInput) => {
    const text = message.trim();
    if (text.length < 3) throw new Error('Write a few words about what we can pray for.');
    if (!supabase) {
      // Sample mode: nothing to send to yet.
      await new Promise((r) => setTimeout(r, 400));
      return;
    }
    const { error } = await supabase
      .from('prayer_requests')
      .insert({ message: text.slice(0, 2000), name: name?.trim() || null, contact: contact?.trim() || null });
    if (error) {
      // Messages raised by the database's own limits are written for members.
      throw new Error(error.code === 'P0001' ? error.message : 'We couldn’t send your request. Check your connection and try again.');
    }
  }, []);

  const value = useMemo<ContentState>(() => {
    // Until the ministry publishes devotionals and quotes, keep the samples so screens aren't empty.
    const devotionals = snapshot.devotionals.length ? snapshot.devotionals : sample.devotionals;
    const quotes = snapshot.quotes.length ? snapshot.quotes : sample.quotes;
    const today =
      status === 'sample' ? (sample.findDevotional(sample.todaysDevotionalId) ?? devotionals[0]) : devotionals[0];
    return {
      ...snapshot,
      devotionals,
      quotes,
      status,
      refreshing,
      refresh,
      today,
      findDevotional: (id) => devotionals.find((d) => d.id === id),
      sendPrayer,
    };
  }, [snapshot, status, refreshing, refresh, sendPrayer]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used inside ContentProvider');
  return ctx;
}
