import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Linking, Modal, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dateNames, t } from '@/i18n';
import { PosterImage, whenFromNow } from '@/components/event-poster';
import { FormMessage } from '@/components/form';
import { Icon, IconName } from '@/components/icon';
import { LikeButton, StatLine } from '@/components/like-button';
import { Body, Button, Eyebrow, IconButton, Tap, Title } from '@/components/ui';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { calendarLink, eventWhen, paragraphs } from '@/lib/content';
import { success } from '@/lib/haptics';
import { useContent } from '@/state/content';
import { recordView, useStat } from '@/state/engagement';
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
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const [viewing, setViewing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const stat = useStat('event', event?.id);
  useEffect(() => {
    if (event?.id) recordView('event', event.id);
  }, [event?.id]);

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
  const soon = whenFromNow(event.startsAt);
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

  const addToCalendar = () => Linking.openURL(calendarLink(event));

  // Shares the poster itself (the picture people already recognise).
  const sharePoster = async () => {
    if (!event.imageUrl || sharing) return;
    setMessage(null);
    if (Platform.OS === 'web') {
      Linking.openURL(event.imageUrl);
      return;
    }
    setSharing(true);
    try {
      const ext = (event.imageUrl.split('?')[0].match(/\.(jpe?g|png|webp)$/i)?.[1] ?? 'jpg').toLowerCase();
      const file = await File.downloadFileAsync(event.imageUrl, new File(Paths.cache, `poster-${event.id}.${ext}`), { idempotent: true });
      if (await Sharing.isAvailableAsync()) {
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: t('Share poster') });
      }
    } catch {
      setMessage({ tone: 'error', text: t('Couldn’t get the poster. Check your connection and try again.') });
    } finally {
      setSharing(false);
    }
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
        <View style={[styles.hero, { paddingTop: insets.top + 60 }]}>
          <Tap
            accessibilityRole={event.imageUrl ? 'imagebutton' : undefined}
            accessibilityLabel={event.imageUrl ? t('Open the poster full screen') : undefined}
            disabled={!event.imageUrl}
            onPress={() => setViewing(true)}>
            <PosterImage event={event} width={Math.min(screenW - ScreenPadding * 2 - 24, 380)} maxHeight={screenH * 0.62} radius={14} />
          </Tap>
          <View style={[styles.heroBar, { top: insets.top + 4 }]}>
            <IconButton icon="back" label={t('Back')} onPress={back} variant="plain" color="#FFFFFF" />
            {event.imageUrl ? (
              <IconButton icon="share" label={t('Share poster')} onPress={sharePoster} variant="plain" color="#FFFFFF" />
            ) : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: ScreenPadding, gap: 20, marginTop: 24 }}>
          <View style={{ gap: 6 }}>
            <Eyebrow>{ended ? t('This event has ended') : [when.day, soon].filter(Boolean).join(' · ')}</Eyebrow>
            <Title size={34}>{event.title}</Title>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <LikeButton kind="event" id={event.id} label={t('Like this event')} />
            {stat ? <StatLine likes={0} views={stat.views} viewWord="views" showZero /> : null}
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
                <Button label={t('Calendar')} accessibilityLabel={t('Add to calendar')} icon="calendar" variant="outline" onPress={addToCalendar} style={{ flex: 1 }} />
              </View>
              {place || event.imageUrl ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {place ? <Button label={t('Directions')} icon="pin" variant="outline" onPress={directions} style={{ flex: 1 }} /> : null}
                  {event.imageUrl ? (
                    <Button label={sharing ? t('Preparing…') : t('Share poster')} icon="share" variant="outline" onPress={sharePoster} style={{ flex: 1 }} />
                  ) : null}
                </View>
              ) : null}
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

      {event.imageUrl ? (
        <Modal visible={viewing} animationType="fade" onRequestClose={() => setViewing(false)} statusBarTranslucent>
          <View style={styles.viewer}>
            <Image source={{ uri: event.imageUrl }} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel={t('Poster: {title}', { title: event.title })} />
            <View style={[styles.heroBar, { top: insets.top + 8 }]}>
              <IconButton icon="close" label={t('Close')} onPress={() => setViewing(false)} variant="plain" color="#FFFFFF" />
              <IconButton icon="share" label={t('Share poster')} onPress={sharePoster} variant="plain" color="#FFFFFF" />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    hero: { backgroundColor: '#17120E', alignItems: 'center', paddingBottom: 28 },
    viewer: { flex: 1, backgroundColor: '#0B0907' },
    heroBar: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
    facts: { borderRadius: Radius.lg, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, paddingHorizontal: 14 },
    fact: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    factLine: { borderTopWidth: 1, borderTopColor: c.line },
    factIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.parchment, alignItems: 'center', justifyContent: 'center' },
    factLabel: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: c.text },
    factDetail: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
    invite: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.lg, backgroundColor: c.parchment },
  });
