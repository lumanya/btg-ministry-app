import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { type Href, useRouter } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { getLang, t } from '@/i18n';
import type { MinistryEvent } from '@/lib/content';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/state/auth';

/**
 * Push notifications ("We're live", today's devotional, service and event reminders,
 * announcements from staff) and local event reminders.
 *
 * The phone's Expo push token is stored in Supabase (push_devices) with the topics
 * the member chose; the send-notifications server function does the sending.
 */

export type Topic = 'live' | 'devotional' | 'services' | 'events' | 'announcements';

export const TOPICS: { id: Topic; label: string; hint: string }[] = [
  { id: 'live', label: 'We’re live', hint: 'When a service starts streaming' },
  { id: 'devotional', label: 'Daily devotional', hint: 'Each morning when the new word is posted' },
  { id: 'services', label: 'Service reminders', hint: '30 minutes before a service' },
  { id: 'events', label: 'Events', hint: 'The day before and when it’s about to start' },
  { id: 'announcements', label: 'Announcements', hint: 'News from the ministry' },
];

const ALL: Topic[] = TOPICS.map((x) => x.id);
const STORAGE_KEY = 'btg.push.v1';

type Stored = {
  enabled: boolean;
  token: string | null;
  topics: Topic[];
  promptDismissed: boolean;
  /** event id -> scheduled local notification ids */
  reminders: Record<string, string[]>;
};

const initial: Stored = { enabled: false, token: null, topics: ALL, promptDismissed: false, reminders: {} };

type Result = { ok: true } | { ok: false; error: string };

type NotificationsState = {
  ready: boolean;
  /** Null when this phone can receive push notifications; otherwise why not. */
  unsupported: string | null;
  enabled: boolean;
  topics: Topic[];
  busy: boolean;
  enable: () => Promise<Result>;
  disable: () => Promise<void>;
  setTopic: (topic: Topic, on: boolean) => void;
  /** The "never miss a service" card on Home. */
  showPrompt: boolean;
  dismissPrompt: () => void;
  isReminded: (eventId: string) => boolean;
  remind: (event: MinistryEvent) => Promise<Result>;
  cancelReminder: (eventId: string) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsState | null>(null);

if (Platform.OS !== 'web') {
  // Show notifications as banners even while the app is open.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Why push can't work here, or null when it can. */
function pushUnsupported(): string | null {
  if (Platform.OS === 'web') return t('Notifications are available in the BTG Ministry phone app.');
  if (!Device.isDevice) return t('Notifications need a real phone, not a simulator.');
  if (Constants.executionEnvironment === 'storeClient' && Platform.OS === 'android')
    return t('Notifications work in the installed BTG Ministry app, not in Expo Go.');
  if (!projectId()) return t('Notifications switch on once the app is built for the app stores.');
  return null;
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'BTG Ministry',
      // eslint-disable-next-line import/namespace -- exported by expo-notifications; the lint resolver misses it
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#8B5A2B',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function register(token: string, topics: Topic[]) {
  if (!supabase) return;
  const { error } = await supabase.rpc('register_push_device', { device_token: token, device_platform: Platform.OS, device_topics: topics, device_locale: getLang() });
  if (error) throw error;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const auth = useAuth();
  const uid = auth.session?.user.id ?? null;
  const [data, setData] = useState<Stored>(initial);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const unsupported = useMemo(() => pushUnsupported(), []);
  const registeredFor = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setData({ ...initial, ...(JSON.parse(raw) as Partial<Stored>) }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const save = useCallback((fn: (d: Stored) => Stored) => {
    setData((d) => {
      const next = fn(d);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // Open the right screen when a notification is tapped (also when it launched the app).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const open = (n: Notifications.Notification) => {
      const url = n.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) setTimeout(() => open(last.notification), 300);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification));
    return () => sub.remove();
  }, [router]);

  // Keep the server's copy fresh, and link the phone to the member after sign-in.
  useEffect(() => {
    if (!ready || !data.enabled || !data.token || unsupported) return;
    if (registeredFor.current === uid) return;
    registeredFor.current = uid;
    register(data.token, data.topics).catch(() => {
      registeredFor.current = undefined;
    });
  }, [ready, data.enabled, data.token, data.topics, uid, unsupported]);

  const enable = useCallback(async (): Promise<Result> => {
    if (unsupported) return { ok: false, error: unsupported };
    setBusy(true);
    try {
      if (!(await ensurePermission())) {
        return { ok: false, error: t('Notifications are turned off for BTG Ministry. Turn them on in your phone’s Settings, then try again.') };
      }
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
      const topics = data.topics.length ? data.topics : ALL;
      await register(token, topics);
      registeredFor.current = uid;
      save((d) => ({ ...d, enabled: true, token, topics, promptDismissed: true }));
      return { ok: true };
    } catch (err) {
      console.warn('Could not turn on notifications', err);
      return { ok: false, error: t('Couldn’t turn on notifications. Check your connection and try again.') };
    } finally {
      setBusy(false);
    }
  }, [unsupported, data.topics, uid, save]);

  const disable = useCallback(async () => {
    const token = data.token;
    save((d) => ({ ...d, enabled: false }));
    if (token && supabase) await supabase.rpc('unregister_push_device', { device_token: token });
  }, [data.token, save]);

  const setTopic = useCallback(
    (topic: Topic, on: boolean) => {
      const topics = on ? Array.from(new Set([...data.topics, topic])) : data.topics.filter((x) => x !== topic);
      save((d) => ({ ...d, topics }));
      if (data.enabled && data.token) register(data.token, topics).catch(() => {});
    },
    [data.topics, data.enabled, data.token, save],
  );

  const remind = useCallback(
    async (event: MinistryEvent): Promise<Result> => {
      if (Platform.OS === 'web') return { ok: false, error: t('Reminders are available in the phone app.') };
      if (!(await ensurePermission())) {
        return { ok: false, error: t('Notifications are turned off for BTG Ministry. Turn them on in your phone’s Settings.') };
      }
      const start = Date.parse(event.startsAt);
      const moments = [
        { at: start - 24 * 3600 * 1000, title: t('Tomorrow: {title}', { title: event.title }) },
        { at: start - 60 * 60 * 1000, title: t('In one hour: {title}', { title: event.title }) },
      ].filter((m) => m.at > Date.now() + 60 * 1000);
      if (!moments.length) return { ok: false, error: t('This event is about to start.') };
      const ids = await Promise.all(
        moments.map((m) =>
          Notifications.scheduleNotificationAsync({
            content: { title: m.title, body: event.locationName ?? 'BTG Ministry', data: { url: `/events/${event.id}` } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(m.at) },
          }),
        ),
      );
      save((d) => ({ ...d, reminders: { ...d.reminders, [event.id]: ids } }));
      return { ok: true };
    },
    [save],
  );

  const cancelReminder = useCallback(
    async (eventId: string) => {
      const ids = data.reminders[eventId] ?? [];
      await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
      save((d) => {
        const reminders = { ...d.reminders };
        delete reminders[eventId];
        return { ...d, reminders };
      });
    },
    [data.reminders, save],
  );

  const value = useMemo<NotificationsState>(
    () => ({
      ready,
      unsupported,
      enabled: data.enabled,
      topics: data.topics,
      busy,
      enable,
      disable,
      setTopic,
      showPrompt: ready && !unsupported && !data.enabled && !data.promptDismissed,
      dismissPrompt: () => save((d) => ({ ...d, promptDismissed: true })),
      isReminded: (id) => !!data.reminders[id],
      remind,
      cancelReminder,
    }),
    [ready, unsupported, data, busy, enable, disable, setTopic, save, remind, cancelReminder],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
