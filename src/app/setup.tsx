import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormMessage } from '@/components/form';
import { Icon } from '@/components/icon';
import { Button, Tap } from '@/components/ui';
import { Fonts, Palette, ScreenPadding } from '@/constants/theme';
import { t } from '@/i18n';
import { success, tick } from '@/lib/haptics';
import { getReminder, markSetupDone, REMINDER_TIMES, ReminderTime, setReminder } from '@/lib/reminder';
import { useNotifications } from '@/state/notifications';
import { useColors, useStyles } from '@/state/theme';

const LABELS: Record<ReminderTime, string> = {
  '06:00': 'Early morning',
  '06:30': 'Before the day starts',
  '07:00': 'Morning',
  '08:00': 'On the way to work',
  '20:00': 'Evening',
};

/** Asked once after the welcome (and from Settings): when to send the daily reminder. */
export default function Setup() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const notify = useNotifications();
  const [time, setTime] = useState<ReminderTime | null>('06:30');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opened again from Settings: start from the current choice.
  useEffect(() => {
    getReminder().then((saved) => saved && setTime(saved));
  }, []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  const save = async () => {
    setError(null);
    setBusy(true);
    if (time && !notify.enabled) {
      const res = await notify.enable();
      if (!res.ok) {
        setBusy(false);
        setError(res.error);
        return;
      }
    }
    const ok = await setReminder(time);
    setBusy(false);
    if (!ok && time) {
      setError(t('This phone couldn’t set the reminder. You can try again from Settings.'));
      return;
    }
    success();
    await markSetupDone();
    close();
  };

  const skip = async () => {
    notify.dismissPrompt();
    await markSetupDone();
    close();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28, paddingHorizontal: ScreenPadding + 6, gap: 28 }}>
        <View style={{ gap: 10 }}>
          <Text style={styles.title} accessibilityRole="header">
            {t('When should we remind you?')}
          </Text>
          <Text style={styles.lead}>{t('One gentle reminder a day for today’s rhythm: read, watch a seed and pray.')}</Text>
        </View>

        <View accessibilityRole="radiogroup">
          {[...REMINDER_TIMES, null].map((value, i) => {
            const on = time === value;
            return (
              <Tap
                key={value ?? 'off'}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  tick();
                  setTime(value);
                }}
                style={[styles.option, i === 0 && { borderTopWidth: 0 }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.optionTime}>{value ?? t('No reminder')}</Text>
                  {value ? <Text style={styles.optionHint}>{t(LABELS[value])}</Text> : null}
                </View>
                <View style={[styles.radio, on && styles.radioOn]}>{on ? <Icon name="check" size={14} color={c.cream} /> : null}</View>
              </Tap>
            );
          })}
        </View>

        {error ? <FormMessage>{error}</FormMessage> : null}

        <View style={{ gap: 6 }}>
          <Button label={busy ? t('Saving…') : time ? t('Remind me at {time}', { time }) : t('Continue')} onPress={busy ? undefined : save} style={{ minHeight: 56 }} />
          <Button label={t('Not now')} variant="outline" onPress={skip} style={{ borderColor: 'transparent' }} />
        </View>
        <Text style={styles.note}>{t('You can change this any time in Settings. Live services and new devotionals can notify you too.')}</Text>
      </ScrollView>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    title: { fontFamily: Fonts.displayMedium, fontSize: 42, lineHeight: 44, color: c.text },
    lead: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, color: c.textMuted },
    option: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, borderTopWidth: 1, borderTopColor: c.line },
    optionTime: { fontFamily: Fonts.display, fontSize: 26, color: c.text, fontVariant: ['lining-nums'] },
    optionHint: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
    radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: c.lineStrong, alignItems: 'center', justifyContent: 'center' },
    radioOn: { backgroundColor: c.brown, borderColor: c.brown },
    note: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, color: c.textMuted, textAlign: 'center' },
  });
