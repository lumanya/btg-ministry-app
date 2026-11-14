import { useRouter } from 'expo-router';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Eagle, ScrollCard } from '@/components/art';
import { Icon } from '@/components/icon';
import { Appear, Pop, Skeleton } from '@/components/motion';
import { Body, Button, Eyebrow, IconButton, ProgressBar, Screen, SectionHeader, Tap, Title } from '@/components/ui';
import { VideoThumb } from '@/components/video-thumb';
import { Brand, Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { findDevotional, formatDate, quotes, todaysDevotionalId } from '@/content/sample';
import { formatLength } from '@/lib/podcast';
import { formatStart, videoMeta, videoTone } from '@/lib/video';
import { useAuth } from '@/state/auth';
import { useFeed } from '@/state/feed';
import { useLibrary } from '@/state/library';
import { usePlayer } from '@/state/player';
import { useColors, useStyles } from '@/state/theme';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const auth = useAuth();
  const lib = useLibrary();
  const { feed, status, refreshing, refresh } = useFeed();
  const player = usePlayer();

  const now = new Date();
  const firstName = auth.name?.split(' ')[0];

  const live = feed.live;
  const next = feed.upcoming[0];
  // While live, feature the stream; otherwise the most recent service.
  const feature = live ?? feed.videos.find((v) => v.kind === 'stream') ?? feed.videos[0];
  const latestVideos = feed.videos.filter((v) => v.id !== feature?.id).slice(0, 4);
  const loading = status === 'loading';

  const today = findDevotional(todaysDevotionalId)!;
  const readToday = lib.isRead(today.id);
  const openToday = () => router.push({ pathname: '/devotional/[id]', params: { id: today.id } });

  const resume = player.resume;
  const listen = resume?.episode ?? player.podcast.episodes[0];
  const remaining = resume && resume.duration > 0 ? resume.duration - resume.position : 0;
  const listenMeta = resume
    ? remaining > 60
      ? `${formatLength(remaining)} left`
      : 'Continue where you stopped'
    : [player.podcast.title, formatLength(listen?.duration ?? null)].filter(Boolean).join(' · ');

  const quote = quotes[now.getDate() % quotes.length];

  const streakTitle = lib.streak > 0 ? `${lib.streak}-day reading streak` : 'Start a reading streak';
  const streakText = lib.readToday
    ? 'You’ve read today. See you tomorrow.'
    : lib.streak > 0
      ? 'Read today’s devotional to keep it going.'
      : 'Read today’s devotional to begin.';

  return (
    <Screen gap={28} refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Eagle height={40} />
          <Text style={styles.brandText}>BTG Ministry</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="bookmark" label="Saved" onPress={() => router.push('/saved')} />
          {auth.session ? (
            <Tap haptic="tap" accessibilityRole="button" accessibilityLabel="Your account" onPress={() => router.push('/profile')} style={styles.avatar}>
              <Text style={styles.avatarText}>{(auth.name ?? auth.email ?? '?').charAt(0).toUpperCase()}</Text>
            </Tap>
          ) : (
            <IconButton icon="user" label="Settings and sign in" onPress={() => router.push('/profile')} />
          )}
        </View>
      </View>

      <Appear>
        <View style={{ gap: 6 }}>
          <Text style={styles.date}>
            {DAYS[now.getDay()]}, {now.getDate()} {MONTHS[now.getMonth()]}
          </Text>
          <Title size={38}>
            {greeting(now)}
            {firstName ? `, ${firstName}` : ''}.
          </Title>
          <Text style={styles.blessing}>Grace and peace to you.</Text>
        </View>
      </Appear>

      <Appear index={1}>
        {loading ? (
          <View style={[styles.liveCard, { gap: 14 }]} accessibilityLabel="Loading the latest service">
            <Skeleton height={176} radius={16} style={{ backgroundColor: 'rgba(248,239,224,0.12)' }} />
            <Skeleton height={22} width="70%" style={{ backgroundColor: 'rgba(248,239,224,0.12)' }} />
            <Skeleton height={14} width="45%" style={{ backgroundColor: 'rgba(248,239,224,0.12)' }} />
          </View>
        ) : feature ? (
          <Tap
            haptic="tap"
            accessibilityRole="button"
            accessibilityLabel={live ? `Join the livestream: ${feature.title}` : `Watch the latest service: ${feature.title}`}
            onPress={() => (live ? router.navigate('/live') : router.push({ pathname: '/sermon/[id]', params: { id: feature.id } }))}
            style={styles.liveCard}>
            <VideoThumb video={feature} height={176} play="center" />
            <View style={styles.liveFooter}>
              <View style={{ gap: 4, flex: 1 }}>
                <Eyebrow onDark style={{ fontSize: 11 }}>
                  {live ? 'Streaming now' : 'Latest service'}
                </Eyebrow>
                <Text style={styles.liveTitle} numberOfLines={2}>
                  {feature.title}
                </Text>
                <Text style={styles.liveMeta}>
                  {live ? 'Iman Mwakanyamale' : next?.scheduledStart ? `Next live: ${formatStart(next.scheduledStart)}` : videoMeta(feature)}
                </Text>
              </View>
              <View style={styles.joinPill}>
                <Text style={styles.joinText}>{live ? 'Join' : 'Watch'}</Text>
              </View>
            </View>
          </Tap>
        ) : null}
      </Appear>

      <Appear index={2} style={{ gap: 4 }}>
        <SectionHeader title="Today's devotional" action="See all" onAction={() => router.navigate('/devotional')} />
        <ScrollCard>
          <View style={styles.rowBetween}>
            <Eyebrow style={{ fontSize: 12 }}>{formatDate(today.date)}</Eyebrow>
            {readToday ? (
              <View style={[styles.refChip, styles.readChip]}>
                <Icon name="check" size={13} color={c.cream} />
                <Text style={[styles.refText, { color: c.cream }]}>Read</Text>
              </View>
            ) : today.scripture ? (
              <View style={styles.refChip}>
                <Text style={styles.refText}>{today.scripture.ref}</Text>
              </View>
            ) : null}
          </View>
          <Title size={32}>{today.title}</Title>
          <Body>{today.excerpt}</Body>
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
            <Button label={readToday ? 'Read again' : 'Read now'} variant={readToday ? 'outline' : 'primary'} onPress={openToday} style={{ flex: 1, minHeight: 46 }} />
            <IconButton
              icon="podcast"
              label="Listen to this devotional"
              size={46}
              onPress={() => router.push('/player')}
              style={{ borderColor: c.accent, backgroundColor: 'transparent' }}
            />
          </View>
        </ScrollCard>
      </Appear>

      <Appear index={3}>
        <Tap accessibilityRole="button" accessibilityLabel={`${streakTitle}. ${streakText}`} onPress={openToday} style={styles.streakCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Pop trigger={lib.streak} style={[styles.flameDisc, lib.readToday && { backgroundColor: c.brown }]}>
              <Icon name="flame" color={lib.readToday ? c.gold : c.accent} filled={lib.readToday} />
            </Pop>
            <View style={{ gap: 2, flex: 1 }}>
              <Text style={styles.cardTitle}>{streakTitle}</Text>
              <Text style={styles.metaText}>{streakText}</Text>
            </View>
          </View>
          <View style={styles.week}>
            {lib.week.map((d, i) => (
              <View key={d.key} style={{ alignItems: 'center', gap: 6 }}>
                <View style={[styles.dot, d.read && styles.dotDone, d.isToday && !d.read && styles.dotToday]}>
                  {d.read ? <Icon name="check" size={14} color={c.cream} /> : null}
                </View>
                <Text style={[styles.dayLetter, d.isToday && { color: c.text, fontFamily: Fonts.sansBold }]}>{WEEK_LETTERS[i]}</Text>
              </View>
            ))}
          </View>
          {lib.bestStreak > lib.streak ? <Text style={styles.metaText}>Your best: {lib.bestStreak} days in a row</Text> : null}
        </Tap>
      </Appear>

      {listen ? (
        <Appear index={4} style={{ gap: 8 }}>
          <SectionHeader title={resume ? 'Continue listening' : 'Listen'} action="Podcast" onAction={() => router.navigate('/podcast')} />
          <View style={styles.listenRow}>
            <Tap
              accessibilityRole="button"
              accessibilityLabel={`Open the player: ${listen.title}`}
              onPress={() => router.push('/player')}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={styles.listenArt}>
                <Eagle height={54} light />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.listenTitle} numberOfLines={2}>
                  {listen.title}
                </Text>
                <Text style={styles.metaText}>{listenMeta}</Text>
                {resume && resume.duration > 0 ? <ProgressBar value={resume.position / resume.duration} /> : null}
              </View>
            </Tap>
            <IconButton
              icon={player.playing ? 'pause' : 'play'}
              label={player.playing ? 'Pause' : `Play ${listen.title}`}
              variant="solid"
              iconSize={18}
              onPress={() => (player.episode ? player.toggle() : player.play(listen))}
            />
          </View>
        </Appear>
      ) : null}

      <Appear index={5} style={{ gap: 8 }}>
        <SectionHeader title="Latest sermons" action="See all" onAction={() => router.navigate('/sermons')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={236 + 14}
          style={{ marginHorizontal: -ScreenPadding }}
          contentContainerStyle={{ paddingHorizontal: ScreenPadding, gap: 14 }}>
          {loading
            ? [0, 1].map((i) => (
                <View key={i} style={{ width: 236, gap: 10 }}>
                  <Skeleton height={132} radius={16} />
                  <Skeleton height={16} width="80%" />
                  <Skeleton height={12} width="50%" />
                </View>
              ))
            : latestVideos.map((v, i) => (
                <Tap
                  key={v.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${v.title}, ${videoMeta(v)}`}
                  onPress={() => router.push({ pathname: '/sermon/[id]', params: { id: v.id } })}
                  style={{ width: 236, gap: 10 }}>
                  <VideoThumb video={v} height={132} tone={videoTone(i)} />
                  <View style={{ gap: 2 }}>
                    <Text style={styles.sermonTitle} numberOfLines={2}>
                      {v.title}
                    </Text>
                    <Text style={styles.metaText}>{videoMeta(v)}</Text>
                  </View>
                </Tap>
              ))}
        </ScrollView>
      </Appear>

      <Appear index={6}>
        <View style={styles.quote}>
          <Eyebrow style={{ fontSize: 12 }}>Word for today</Eyebrow>
          <Text style={styles.quoteText}>“{quote}”</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Iman Mwakanyamale</Text>
            <IconButton
              icon="share"
              label="Share this word"
              iconSize={18}
              onPress={() => Share.share({ message: `“${quote}” — Iman Mwakanyamale, BTG Ministry` })}
              style={{ backgroundColor: 'transparent', borderColor: c.accent }}
            />
          </View>
        </View>
      </Appear>
    </Screen>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brown, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: Fonts.display, fontSize: 22, color: c.cream },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    brandText: { fontFamily: Fonts.display, fontSize: 22, color: c.text },
    date: { fontFamily: Fonts.sansSemiBold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: c.eyebrow },
    blessing: { fontFamily: Fonts.displayItalic, fontSize: 20, color: c.textMuted },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },

    liveCard: {
      backgroundColor: c.brown,
      borderRadius: Radius.xl,
      padding: 14,
      paddingBottom: 18,
      gap: 14,
      shadowColor: Brand.brownDark,
      shadowOpacity: 0.22,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    liveFooter: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 4 },
    liveTitle: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 30, color: c.cream },
    liveMeta: { fontFamily: Fonts.sans, fontSize: 14, color: c.creamMuted },
    joinPill: { height: 40, paddingHorizontal: 18, borderRadius: Radius.pill, backgroundColor: c.cream, justifyContent: 'center' },
    joinText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Brand.brownDark },

    refChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: c.lineStrong, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
    readChip: { backgroundColor: c.brown, borderColor: c.brown },
    refText: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: c.textMuted },

    streakCard: { gap: 16, padding: 18, borderRadius: Radius.lg, backgroundColor: c.white, borderWidth: 1, borderColor: c.line },
    flameDisc: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.parchment, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 16, color: c.text },
    week: { flexDirection: 'row', justifyContent: 'space-between' },
    dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.sand, alignItems: 'center', justifyContent: 'center' },
    dotDone: { backgroundColor: c.brown },
    dotToday: { backgroundColor: 'transparent', borderWidth: 2, borderStyle: 'dashed', borderColor: c.accent },
    dayLetter: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: c.textMuted },

    listenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 12,
      borderRadius: Radius.lg,
      backgroundColor: c.white,
      borderWidth: 1,
      borderColor: c.line,
    },
    listenArt: { width: 64, height: 64, borderRadius: 14, backgroundColor: c.brown, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
    listenTitle: { fontFamily: Fonts.display, fontSize: 21, lineHeight: 22, color: c.text },
    metaText: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, color: c.textMuted },
    sermonTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, lineHeight: 20, color: c.text },

    quote: { gap: 14, padding: 20, paddingTop: 24, borderRadius: Radius.lg, backgroundColor: c.sand },
    quoteText: { fontFamily: Fonts.displayItalic, fontSize: 24, lineHeight: 29, color: c.brownDark },
  });
