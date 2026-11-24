import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import * as sample from '@/content/sample';
import type { Devotional } from '@/content/sample';
import {
  DEVOTIONAL_COLUMNS,
  DevotionalRow,
  EVENT_COLUMNS,
  EventRow,
  mapEvent,
  MinistryEvent,
  PlaylistSetting,
  upcomingEvents,
  GivingMethod,
  GivingRow,
  mapDevotional,
  mapGiving,
  mapSeries,
  mapService,
  mapPrayer,
  Prayer,
  PrayerRow,
  prayerOfDay,
  Series,
  Service,
  ServiceRow,
} from '@/lib/content';
import { supabase } from '@/lib/supabase';
import { getLang } from '@/i18n';
import { useDataSaver } from '@/state/data-saver';

/**
 * Devotionals, series, weekly services, giving details and quotes.
 *
 * With Supabase connected these come from the database (posted from the admin
 * dashboard) and a copy is kept on the phone for offline use. Without it, the
 * built-in sample content is shown.
 */
// One saved copy per language, since the content differs.
const cacheKey = () => `btg.content.v3.${getLang()}`;
/** Check for new content when the app comes back to the front, at most this often. */
const REFRESH_AFTER_MS = 15 * 60 * 1000;
/** With data saver on. */
const SAVER_REFRESH_AFTER_MS = 60 * 60 * 1000;

type Snapshot = {
  devotionals: Devotional[];
  series: Series[];
  services: Service[];
  giving: GivingMethod[];
  quotes: string[];
  prayers: Prayer[];
  events: MinistryEvent[];
  playlistSettings: PlaylistSetting[];
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
  /** Events that haven't finished yet, soonest first. */
  upcoming: MinistryEvent[];
  findEvent: (id: string) => MinistryEvent | undefined;
  /** Today's confession & declaration for "A minute of prayer", when staff have added some. */
  prayer: Prayer | null;
  /** Sends a prayer request to the ministry. Throws an Error with a message to show. */
  sendPrayer: (input: PrayerInput) => Promise<void>;
};

const sampleSnapshot: Snapshot = {
  devotionals: sample.devotionals,
  series: sample.podcast.series,
  services: sample.services,
  giving: sample.giving,
  quotes: sample.quotes,
  prayers: [],
  events: [],
  playlistSettings: [],
};

const ContentContext = createContext<ContentState | null>(null);

async function fetchSnapshot(): Promise<Snapshot> {
  if (!supabase) throw new Error('Not connected');
  const since = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
  const [devotionals, series, services, giving, quotes, events, playlists, prayers] = await Promise.all([
    supabase.from('devotionals').select(DEVOTIONAL_COLUMNS).order('publish_on', { ascending: false }).limit(90),
    supabase.from('series').select('name,tone').order('sort').order('name'),
    supabase.from('services').select('id,name,name_sw,weekday,start_time,venue,livestreamed').order('sort').order('weekday'),
    supabase.from('giving_methods').select('id,label,number,account_name').order('sort'),
    supabase.from('quotes').select('text,text_sw').order('created_at'),
    supabase.from('events').select(EVENT_COLUMNS).gte('starts_at', since).order('starts_at').limit(30),
    supabase.from('playlists').select('youtube_id,title,visible,sort'),
    supabase.from('prayers').select('id,kind,text,text_sw,scripture').eq('active', true).order('sort').order('created_at'),
  ]);
  const failed = [devotionals, series, services, giving, quotes].find((r) => r.error);
  if (failed?.error) throw failed.error;
  return {
    devotionals: ((devotionals.data ?? []) as unknown as DevotionalRow[]).map((r) => mapDevotional(r, getLang())),
    series: (series.data ?? []).map(mapSeries),
    services: ((services.data ?? []) as ServiceRow[]).map((r) => mapService(r, getLang())),
    giving: ((giving.data ?? []) as GivingRow[]).map(mapGiving),
    quotes: (quotes.data ?? []).map((q: { text: string; text_sw?: string | null }) => (getLang() === 'sw' && q.text_sw?.trim() ? q.text_sw : q.text)),
    // Newer tables: an error here (e.g. not set up yet) just means none to show.
    events: ((events.data ?? []) as EventRow[]).map((r) => mapEvent(r, getLang())),
    playlistSettings: (playlists.data ?? []) as PlaylistSetting[],
    prayers: ((prayers.data ?? []) as PrayerRow[]).map((r) => mapPrayer(r, getLang())),
  };
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(sampleSnapshot);
  const [status, setStatus] = useState<ContentState['status']>(supabase ? 'loading' : 'sample');
  const [refreshing, setRefreshing] = useState(false);
  const lastFetch = useRef(0);
  const saving = useDataSaver().active;
  const savingRef = useRef(saving);
  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  const load = useCallback(async () => {
    if (!supabase) return;
    try {
      const fresh = await fetchSnapshot();
      lastFetch.current = Date.now();
      setSnapshot(fresh);
      setStatus('live');
      AsyncStorage.setItem(cacheKey(), JSON.stringify(fresh)).catch(() => {});
    } catch {
      setStatus((s) => (s === 'live' ? 'live' : 'offline'));
    }
  }, []);

  // Show the saved copy straight away, then fetch the latest.
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    AsyncStorage.getItem(cacheKey())
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
      if (state === 'active' && Date.now() - lastFetch.current > (savingRef.current ? SAVER_REFRESH_AFTER_MS : REFRESH_AFTER_MS)) load();
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
      upcoming: upcomingEvents(snapshot.events),
      findEvent: (id) => snapshot.events.find((e) => e.id === id),
      prayer: prayerOfDay(snapshot.prayers ?? []),
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
