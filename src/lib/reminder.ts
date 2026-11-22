import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '@/i18n';

/**
 * The daily reminder for today's rhythm, at a time each member picks.
 * Scheduled on the phone itself (no server needed), repeating every day.
 */
const KEY = 'btg.reminder.v1';
const SETUP_KEY = 'btg.setup.v1';

export const REMINDER_TIMES = ['06:00', '06:30', '07:00', '08:00', '20:00'] as const;
export type ReminderTime = (typeof REMINDER_TIMES)[number];

type Stored = { time: ReminderTime | null; id: string | null };

export async function getReminder(): Promise<ReminderTime | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? ((JSON.parse(raw) as Stored).time ?? null) : null;
  } catch {
    return null;
  }
}

/** Replaces any earlier reminder; null turns it off. Returns false if the phone can't schedule it. */
export async function setReminder(time: ReminderTime | null): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const old = raw ? (JSON.parse(raw) as Stored) : null;
    if (old?.id) await Notifications.cancelScheduledNotificationAsync(old.id).catch(() => {});
    let id: string | null = null;
    if (time) {
      const [hour, minute] = time.split(':').map(Number);
      id = await Notifications.scheduleNotificationAsync({
        content: {
          title: t('Today’s rhythm'),
          body: t('Read, watch a seed and pray: five minutes with the Word.'),
          data: { url: '/home' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
    }
    await AsyncStorage.setItem(KEY, JSON.stringify({ time, id } satisfies Stored));
    return true;
  } catch (err) {
    console.warn('Could not schedule the daily reminder', err);
    return false;
  }
}

/** The one-time "when should we remind you?" screen has been answered (or skipped). */
export async function setupDone(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SETUP_KEY)) === 'done';
  } catch {
    return true;
  }
}

export async function markSetupDone() {
  await AsyncStorage.setItem(SETUP_KEY, 'done').catch(() => {});
}
