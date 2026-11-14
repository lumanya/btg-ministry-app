import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { Eagle } from '@/components/art';
import { Icon, IconName } from '@/components/icon';
import { Body, Button, Eyebrow, IconButton, Screen, Tap, Title } from '@/components/ui';
import { VideoThumb } from '@/components/video-thumb';
import { YouTubePlayer } from '@/components/youtube-player';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { links, services } from '@/content/sample';
import { formatStart, videoMeta, youtubeWatchUrl } from '@/lib/video';
import { useFeed } from '@/state/feed';
import { useColors, useStyles } from '@/state/theme';

type Panel = 'upcoming' | 'prayer';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const [reminders, setReminders] = useState<Record<string, boolean>>({});
  const [prayer, setPrayer] = useState('');
  const [sent, setSent] = useState(false);

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
          day: DAYS[d.getDay()],
          time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
          name: v.title,
          meta: formatStart(v.scheduledStart!),
        };
      })
    : services;

  const actions: { icon: IconName; label: string; onPress: () => void; primary?: boolean }[] = [
    { icon: 'chat', label: 'Prayer', onPress: () => setPanel('prayer') },
    { icon: 'heart', label: 'Give', onPress: () => router.push('/give'), primary: true },
    { icon: 'sermons', label: 'YouTube', onPress: () => WebBrowser.openBrowserAsync(liveUrl) },
  ];

  return (
    <Screen gap={20} refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <Title>Live</Title>
        <IconButton
          icon="share"
          label="Share the livestream"
          iconSize={18}
          onPress={() => Share.share({ message: `Join the BTG Ministry livestream: ${liveUrl}` })}
        />
      </View>

      {live ? (
        <>
          {watching ? (
            <YouTubePlayer youtubeId={live.youtubeId!} style={{ height: playerHeight, borderRadius: 18 }} />
          ) : (
            <Tap accessibilityRole="button" accessibilityLabel={`Watch the livestream: ${live.title}`} onPress={() => setWatchingId(live.id)}>
              <VideoThumb video={live} height={playerHeight} radius={18} play="center" />
            </Tap>
          )}
          <View style={{ gap: 8 }}>
            <Title size={30}>{live.title}</Title>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.avatar}>
                <Eagle height={26} />
              </View>
              <Text style={styles.meta}>
                <Text style={{ fontFamily: Fonts.sansSemiBold, color: c.text }}>Iman Mwakanyamale</Text> · Streaming now
              </Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.offline}>
          <View style={styles.offlineArt}>
            <Eagle height={64} light />
          </View>
          <View style={{ gap: 6 }}>
            <Title size={28}>We’re not live right now.</Title>
            <Body>
              {feed.upcoming[0]?.scheduledStart
                ? `The next livestream starts ${formatStart(feed.upcoming[0].scheduledStart)}. Turn on a reminder below.`
                : 'Turn on a reminder below and we’ll let you know when the next service begins.'}
            </Body>
          </View>
          {latest ? (
            <Tap
              accessibilityRole="button"
              accessibilityLabel={`Watch the latest service: ${latest.title}`}
              onPress={() => router.push({ pathname: '/sermon/[id]', params: { id: latest.id } })}
              style={styles.latest}>
              <VideoThumb video={latest} height={68} titleSize={12} radius={10} style={{ width: 120, gap: 6 }} />
              <View style={{ flex: 1, gap: 3 }}>
                <Eyebrow style={{ fontSize: 11 }}>Latest service</Eyebrow>
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
              <Text style={[styles.segmentText, on && { color: c.cream }]}>{p === 'upcoming' ? 'Coming up' : 'Prayer request'}</Text>
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
                  label={on ? `Turn off the reminder for ${s.name}` : `Remind me about ${s.name}`}
                  iconSize={18}
                  onPress={() => setReminders((r) => ({ ...r, [s.id]: !on }))}
                  style={!on ? { borderColor: c.accent, backgroundColor: 'transparent' } : undefined}
                />
              </View>
            );
          })}
          <Text style={styles.metaSmall} accessibilityLiveRegion="polite">
            {anyReminder ? 'We will notify you when the stream starts.' : ' '}
          </Text>
        </View>
      ) : (
        <View style={styles.prayerCard}>
          {sent ? (
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }} accessibilityLiveRegion="polite">
              <View style={styles.checkDisc}>
                <Icon name="check" color={c.cream} />
              </View>
              <Title size={26} style={{ textAlign: 'center' }}>Your request is with us.</Title>
              <Body style={{ textAlign: 'center' }}>We are standing with you in prayer.</Body>
              <Button
                label="Send another"
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
                Your prayer request
              </Text>
              <TextInput
                value={prayer}
                onChangeText={setPrayer}
                multiline
                accessibilityLabelledBy="prayerLabel"
                accessibilityLabel="Your prayer request"
                placeholder="Share what you would like the ministry to pray for"
                placeholderTextColor={c.textSubtle}
                style={styles.textArea}
              />
              <Button label="Send to the prayer team" onPress={() => prayer.trim() && setSent(true)} />
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
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.sand, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2, overflow: 'hidden' },
  meta: { fontFamily: Fonts.sans, fontSize: 14, color: c.textMuted },
  metaSmall: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
  offline: { gap: 16, padding: 18, borderRadius: Radius.xl, backgroundColor: c.parchment, borderWidth: 1, borderColor: c.line },
  offlineArt: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.brown, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
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
