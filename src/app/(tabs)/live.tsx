import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { dayName, t } from '@/i18n';
import { EagleMark } from '@/components/eagle-mark';
import { Icon, IconName } from '@/components/icon';
import { Body, Button, Eyebrow, IconButton, Screen, Tap, Title } from '@/components/ui';
import { VideoThumb } from '@/components/video-thumb';
import { YouTubePlayer } from '@/components/youtube-player';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { FormMessage } from '@/components/form';
import { links } from '@/content/sample';
import { formatStart, videoMeta, youtubeWatchUrl } from '@/lib/video';
import { useContent } from '@/state/content';
import { useFeed } from '@/state/feed';
import { useColors, useStyles } from '@/state/theme';

type Panel = 'upcoming' | 'prayer';


export default function Live() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { feed, refreshing, refresh } = useFeed();
  const live = feed.live;
  const latest = feed.videos.find((v) => v.kind === 'stream') ?? feed.videos[0];

  const [watchingId, setWatchingId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('upcoming');
  // Opened from "Send a prayer request" (Pray): show the prayer form. `at` changes on every visit.
  const params = useLocalSearchParams<{ panel?: string; at?: string }>();
  const [openedAt, setOpenedAt] = useState<string | undefined>(undefined);
  if (params.panel === 'prayer' && params.at !== openedAt) {
    setOpenedAt(params.at);
    setPanel('prayer');
  }
  const [reminders, setReminders] = useState<Record<string, boolean>>({});
  const [prayer, setPrayer] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [prayerError, setPrayerError] = useState<string | null>(null);
  const content = useContent();

  const sendPrayer = async () => {
    if (sending) return;
    setPrayerError(null);
    setSending(true);
    try {
      await content.sendPrayer({ message: prayer });
      setSent(true);
    } catch (e) {
      setPrayerError(e instanceof Error ? e.message : t('We couldn’t send your request. Try again.'));
    } finally {
      setSending(false);
    }
  };

  const playerHeight = Math.round((Math.min(width, 700) - ScreenPadding * 2) * (9 / 16));
  const watching = !!live?.youtubeId && watchingId === live.id;
  const liveUrl = (live && youtubeWatchUrl(live)) ?? links.youtubeStreams;
  const anyReminder = Object.values(reminders).some(Boolean);

  // Streams scheduled on YouTube come first; otherwise the regular services.
  const schedule = feed.upcoming.length
    ? feed.upcoming.map((v) => {
        const d = new Date(v.scheduledStart!);
        return {
          id: v.id,
          day: dayName(d.getDay(), true),
          time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
          name: v.title,
          meta: formatStart(v.scheduledStart!),
        };
      })
    : content.services.map((s) => ({
        ...s,
        // Day and "Livestreamed" in the member's language.
        day: s.weekday === undefined ? s.day : dayName(s.weekday, true),
        meta: s.weekday === undefined ? s.meta : [s.venue?.trim(), s.livestreamed ? t('Livestreamed') : null].filter(Boolean).join(' · '),
      }));

  const actions: { icon: IconName; label: string; onPress: () => void; primary?: boolean }[] = [
    { icon: 'chat', label: t('Prayer'), onPress: () => setPanel('prayer') },
    { icon: 'heart', label: t('Give'), onPress: () => router.push('/give'), primary: true },
    { icon: 'sermons', label: 'YouTube', onPress: () => WebBrowser.openBrowserAsync(liveUrl) },
  ];

  return (
    <Screen gap={20} refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: -10 }}>
          <IconButton icon="back" label={t('Back to Watch')} variant="plain" iconSize={22} onPress={() => router.navigate('/sermons')} />
          <Title>{t('Live')}</Title>
        </View>
        <IconButton
          icon="share"
          label={t('Share the livestream')}
          iconSize={18}
          onPress={() => Share.share({ message: `Join the BTG Ministry livestream: ${liveUrl}` })}
        />
      </View>

      {live ? (
        <>
          {watching ? (
            <YouTubePlayer youtubeId={live.youtubeId!} style={{ height: playerHeight, borderRadius: 18 }} />
          ) : (
            <Tap accessibilityRole="button" accessibilityLabel={t('Watch the livestream: {title}', { title: live.title })} onPress={() => setWatchingId(live.id)}>
              <VideoThumb video={live} height={playerHeight} radius={18} play="center" />
            </Tap>
          )}
          <View style={{ gap: 8 }}>
            <Title size={30}>{live.title}</Title>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.avatar}>
                <EagleMark height={20} />
              </View>
              <Text style={styles.meta}>
                <Text style={{ fontFamily: Fonts.sansSemiBold, color: c.text }}>Iman Mwakanyamale</Text> · {t('Streaming now')}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.offline}>
          <View style={styles.offlineArt}>
            <EagleMark height={40} />
          </View>
          <View style={{ gap: 6 }}>
            <Title size={28}>{t('We’re not live right now.')}</Title>
            <Body>
              {feed.upcoming[0]?.scheduledStart
                ? t('The next livestream starts {when}. Turn on a reminder below.', { when: formatStart(feed.upcoming[0].scheduledStart) })
                : t('Turn on a reminder below and we’ll let you know when the next service begins.')}
            </Body>
          </View>
          {latest ? (
            <Tap
              accessibilityRole="button"
              accessibilityLabel={t('Watch the latest service: {title}', { title: latest.title })}
              onPress={() => router.push({ pathname: '/sermon/[id]', params: { id: latest.id } })}
              style={styles.latest}>
              <VideoThumb video={latest} height={68} titleSize={12} radius={10} style={{ width: 120, gap: 6 }} />
              <View style={{ flex: 1, gap: 3 }}>
                <Eyebrow style={{ fontSize: 11 }}>{t('Latest service')}</Eyebrow>
                <Text style={styles.latestTitle} numberOfLines={2}>{latest.title}</Text>
                <Text style={styles.metaSmall}>{videoMeta(latest)}</Text>
              </View>
            </Tap>
          ) : null}
        </View>
      )}

      <View style={styles.actions}>
        {actions.map((a) => (
          <Tap
            key={a.label}
            accessibilityRole="button"
            onPress={a.onPress}
            style={[styles.action, a.primary && { backgroundColor: c.brown, borderColor: c.brown }]}>
            <Icon name={a.icon} size={20} color={a.primary ? c.cream : c.brownDark} />
            <Text style={[styles.actionText, a.primary && { color: c.cream }]}>{a.label}</Text>
          </Tap>
        ))}
      </View>

      <View style={styles.segment} accessibilityRole="tablist">
        {(['upcoming', 'prayer'] as Panel[]).map((p) => {
          const on = panel === p;
          return (
            <Tap
              key={p}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setPanel(p)}
              style={[styles.segmentItem, on && styles.segmentOn]}>
              <Text style={[styles.segmentText, on && { color: c.cream }]}>{p === 'upcoming' ? t('Coming up') : t('Prayer request')}</Text>
            </Tap>
          );
        })}
      </View>

      {panel === 'upcoming' ? (
        <View style={{ gap: 10 }}>
          {schedule.map((s) => {
            const on = !!reminders[s.id];
            return (
              <View key={s.id} style={styles.service}>
                <View style={styles.dayBox}>
                  <Text style={styles.dayText}>{s.day}</Text>
                  <Text style={styles.timeText}>{s.time}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.serviceName} numberOfLines={2}>{s.name}</Text>
                  <Text style={styles.metaSmall}>{s.meta}</Text>
                </View>
                <IconButton
                  icon="bell"
                  filled={on}
                  selected={on}
                  variant={on ? 'solid' : 'outline'}
                  label={on ? t('Turn off the reminder for {name}', { name: s.name }) : t('Remind me about {name}', { name: s.name })}
                  iconSize={18}
                  onPress={() => setReminders((r) => ({ ...r, [s.id]: !on }))}
                  style={!on ? { borderColor: c.accent, backgroundColor: 'transparent' } : undefined}
                />
              </View>
            );
          })}
          <Text style={styles.metaSmall} accessibilityLiveRegion="polite">
            {anyReminder ? t('We will notify you when the stream starts.') : ' '}
          </Text>
        </View>
      ) : (
        <View style={styles.prayerCard}>
          {sent ? (
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }} accessibilityLiveRegion="polite">
              <View style={styles.checkDisc}>
                <Icon name="check" color={c.cream} />
              </View>
              <Title size={26} style={{ textAlign: 'center' }}>{t('Your request is with us.')}</Title>
              <Body style={{ textAlign: 'center' }}>{t('We are standing with you in prayer.')}</Body>
              <Button
                label={t('Send another')}
                variant="outline"
                onPress={() => {
                  setPrayer('');
                  setSent(false);
                }}
                style={{ minHeight: 44 }}
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Text style={styles.label} nativeID="prayerLabel">
                {t('Your prayer request')}
              </Text>
              <TextInput
                value={prayer}
                onChangeText={(t) => {
                  setPrayer(t);
                  if (prayerError) setPrayerError(null);
                }}
                maxLength={2000}
                multiline
                accessibilityLabelledBy="prayerLabel"
                accessibilityLabel={t('Your prayer request')}
                placeholder={t('Share what you would like the ministry to pray for')}
                placeholderTextColor={c.textSubtle}
                style={styles.textArea}
              />
              {prayerError ? <FormMessage>{prayerError}</FormMessage> : null}
              <Button label={sending ? t('Sending…') : t('Send to the prayer team')} onPress={sendPrayer} />
              <Text style={styles.metaSmall}>{t('Only the ministry’s prayer team can read your request.')}</Text>
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#17120E', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  meta: { fontFamily: Fonts.sans, fontSize: 14, color: c.textMuted },
  metaSmall: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
  offline: { gap: 16, paddingVertical: 22, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line },
  offlineArt: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#17120E', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  latest: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: Radius.md, backgroundColor: c.white, borderWidth: 1, borderColor: c.line },
  latestTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 14, lineHeight: 19, color: c.text },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    height: 72,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: { fontFamily: Fonts.sansSemiBold, fontSize: 13, color: c.brownDark },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: Radius.pill, backgroundColor: c.parchment, borderWidth: 1, borderColor: c.line },
  segmentItem: { flex: 1, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: c.brown },
  segmentText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.brownDark },
  service: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    paddingLeft: 16,
    borderRadius: 18,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
  },
  dayBox: { width: 56, height: 56, borderRadius: 14, backgroundColor: c.parchment, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: c.eyebrow },
  timeText: { fontFamily: Fonts.display, fontSize: 16, color: c.text },
  serviceName: { fontFamily: Fonts.sansSemiBold, fontSize: 16, color: c.text },
  prayerCard: { padding: 18, borderRadius: 18, backgroundColor: c.white, borderWidth: 1, borderColor: c.line },
  label: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.text },
  textArea: {
    minHeight: 112,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.inputBorder,
    backgroundColor: c.ivory,
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: c.text,
    textAlignVertical: 'top',
  },
  checkDisc: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.brown, alignItems: 'center', justifyContent: 'center' },
});
