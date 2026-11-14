import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dateNames, t } from '@/i18n';
import { Arch } from '@/components/art';
import { FormMessage } from '@/components/form';
import { Icon, IconName } from '@/components/icon';
import { Body, Button, Eyebrow, IconButton, Tap, Title } from '@/components/ui';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { dateTile, eventWhen, paragraphs } from '@/lib/content';
import { success } from '@/lib/haptics';
import { useContent } from '@/state/content';
import { useNotifications } from '@/state/notifications';
import { useColors, useStyles } from '@/state/theme';

export default function EventScreen() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const content = useContent();
  const notify = useNotifications();
  const event = content.findEvent(id);
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/events'));

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: c.ivory, paddingTop: insets.top + 60, paddingHorizontal: ScreenPadding, gap: 16 }}>
        <Title size={28}>{t('This event isn’t available.')}</Title>
        <Button label={t('See all events')} variant="outline" onPress={() => router.replace('/events')} />
      </View>
    );
  }

  const when = eventWhen(event, dateNames());
  const tile = dateTile(event.startsAt, dateNames());
  const reminded = notify.isReminded(event.id);
  // The provider lists events that haven't finished yet.
  const ended = !content.upcoming.some((e) => e.id === event.id);
  const place = [event.locationName, event.address].filter(Boolean).join(', ');

  const toggleReminder = async () => {
    setMessage(null);
    if (reminded) {
      await notify.cancelReminder(event.id);
      setMessage({ tone: 'info', text: t('Reminder removed.') });
      return;
    }
    const res = await notify.remind(event);
    if (res.ok) {
      success();
      setMessage({ tone: 'info', text: t('We’ll remind you the day before and an hour before.') });
    } else setMessage({ tone: 'error', text: res.error });
  };

  const directions = () => {
    const q = encodeURIComponent(place || event.title);
    Linking.openURL(Platform.OS === 'ios' ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  const shareCard = () =>
    router.push({
      pathname: '/share',
      params: { kind: 'event', title: event.title, text: when.multiDay ? when.day : `${when.day} · ${when.time}`, attribution: event.locationName ?? '' },
    });

  const facts: { icon: IconName; label: string; detail?: string }[] = [
    { icon: 'calendar', label: when.day, detail: when.time },
    ...(place ? [{ icon: 'pin' as IconName, label: event.locationName ?? place, detail: event.locationName && event.address ? event.address : undefined }] : []),
    ...(event.livestreamed ? [{ icon: 'live' as IconName, label: t('Streamed live'), detail: t('Watch in the app’s Live tab') }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.ivory }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          {event.imageUrl ? (
            <Image source={{ uri: event.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.heroArt]}>
              <Arch tone="brown" width={110} height={170} eagleHeight={96} />
            </View>
          )}
          <View style={[styles.heroBar, { top: insets.top + 4 }]}>
            <IconButton icon="back" label={t('Back')} onPress={back} />
            <IconButton icon="share" label={t('Share this event')} onPress={shareCard} />
          </View>
        </View>

        <View style={{ paddingHorizontal: ScreenPadding, gap: 20, marginTop: -36 }}>
          <View style={styles.tile}>
            <Text style={styles.tileMonth}>{tile.month}</Text>
            <Text style={styles.tileDay}>{tile.day}</Text>
          </View>
          <View style={{ gap: 6 }}>
            <Eyebrow>{ended ? t('This event has ended') : t('Event')}</Eyebrow>
            <Title size={34}>{event.title}</Title>
          </View>

          <View style={styles.facts}>
            {facts.map((f, i) => (
              <View key={f.label} style={[styles.fact, i > 0 && styles.factLine]}>
                <View style={styles.factIcon}>
                  <Icon name={f.icon} size={18} color={c.accent} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.factLabel}>{f.label}</Text>
                  {f.detail ? <Text style={styles.factDetail}>{f.detail}</Text> : null}
                </View>
              </View>
            ))}
          </View>

          {!ended ? (
            <View style={{ gap: 10 }}>
              {event.registrationUrl ? (
                <Button label={t('Register')} icon="arrow" onPress={() => WebBrowser.openBrowserAsync(event.registrationUrl!)} />
              ) : null}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button
                  label={reminded ? t('Reminder set') : t('Remind me')}
                  icon={reminded ? 'check' : 'bell'}
                  variant={event.registrationUrl ? 'outline' : 'primary'}
                  onPress={toggleReminder}
                  style={{ flex: 1 }}
                />
                {place ? <Button label={t('Directions')} icon="pin" variant="outline" onPress={directions} style={{ flex: 1 }} /> : null}
              </View>
              {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
            </View>
          ) : null}

          {event.description ? (
            <View style={{ gap: 12 }}>
              {paragraphs(event.description).map((p, i) => (
                <Body key={i} style={{ fontSize: 16, lineHeight: 26, color: c.text }}>
                  {p}
                </Body>
              ))}
            </View>
          ) : null}

          <Tap accessibilityRole="button" onPress={shareCard} style={styles.invite}>
            <Icon name="image" color={c.accent} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.factLabel}>{t('Invite someone')}</Text>
              <Text style={styles.factDetail}>{t('Share a card on WhatsApp or your status')}</Text>
            </View>
            <Icon name="chevron" size={18} color={c.accent} />
          </Tap>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    hero: { height: 280, backgroundColor: c.artDeep },
    heroArt: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.artBrown },
    heroBar: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
    tile: {
      width: 72,
      height: 80,
      borderRadius: 18,
      backgroundColor: c.white,
      borderWidth: 1,
      borderColor: c.line,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#3A2413',
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    tileMonth: { fontFamily: Fonts.sansBold, fontSize: 12, letterSpacing: 1.4, color: c.eyebrow },
    tileDay: { fontFamily: Fonts.display, fontSize: 36, lineHeight: 38, color: c.text },
    facts: { borderRadius: Radius.lg, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, paddingHorizontal: 14 },
    fact: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    factLine: { borderTopWidth: 1, borderTopColor: c.line },
    factIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.parchment, alignItems: 'center', justifyContent: 'center' },
    factLabel: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: c.text },
    factDetail: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
    invite: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.lg, backgroundColor: c.parchment },
  });
