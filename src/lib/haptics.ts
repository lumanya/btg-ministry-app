import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Small touch feedback. Does nothing on the web, and never throws. */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

/** A light tap: play, pause, toggles, tab changes. */
export function tap() {
  if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** A selection tick: choosing a day, a filter, a speed. */
export function tick() {
  if (enabled) Haptics.selectionAsync().catch(() => {});
}

/** A success buzz: devotional read, account created, number copied. */
export function success() {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
