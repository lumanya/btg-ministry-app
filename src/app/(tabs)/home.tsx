import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { dayName, monthName, t, weekLetters } from '@/i18n';
import { Eagle, ScrollCard } from '@/components/art';
import { ClipsRail } from '@/components/clips-rail';
import { EventCard } from '@/components/event-card';
import { FormMessage } from '@/components/form';
import { Icon } from '@/components/icon';
import { Appear, Pop, Skeleton } from '@/components/motion';
import { Body, Button, Eyebrow, IconButton, ProgressBar, Screen, SectionHeader, Tap, Title } from '@/components/ui';
import { VideoThumb } from '@/components/video-thumb';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { formatDate } from '@/content/sample';
import { devotionalEpisode } from '@/lib/content';
import { formatLength } from '@/lib/podcast';
import { formatStart, videoMeta, videoTone } from '@/lib/video';
import { useAuth } from '@/state/auth';
import { useClips } from '@/state/clips';
import { useContent } from '@/state/content';
import { useFeed } from '@/state/feed';
import { useLibrary } from '@/state/library';
import { useNotifications } from '@/state/notifications';
import { usePlayer } from '@/state/player';
import { useColors, useStyles } from '@/state/theme';


function greeting(now: Date) {
  const h = now.getHours();
  if (h < 12) return t('Good morning');
  if (h < 17) return t('Good afternoon');
  return t('Good evening');
}

export default function Home() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const auth = useAuth();
  const lib = useLibrary();
  const content = useContent();
  const notify = useNotifications();
  const [promptError, setPromptError] = useState<string | null>(null);
  const nextEvent = content.upcoming[0];
  const { feed, status, refreshing, refresh } = useFeed();
  const refreshAll = () => {
    refresh();
    content.refresh();
  };
  const player = usePlayer();

  const now = new Date();
  const firstName = auth.name?.split(' ')[0];

  const live = feed.live;
  const { clips } = useClips();
  const next = feed.upcoming[0];
  // While live, feature the stream; otherwise the most recent service.
  const feature = live ?? feed.videos.find((v) => v.kind === 'stream') ?? feed.videos[0];
  const latestVideos = feed.videos.filter((v) => v.id !== feature?.id).slice(0, 4);
  const loading = status === 'loading';

  const today = content.today;
  const readToday = lib.isRead(today.id);
  const openToday = () => router.push({ pathname: '/devotional/[id]', params: { id: today.id } });

  const resume = player.resume;
  const listen = resume?.episode ?? player.podcast.episodes[0];
  const remaining = resume && resume.duration > 0 ? resume.duration - resume.position : 0;
  const listenMeta = resume
    ? remaining > 60
      ? t('{time} left', { time: formatLength(remaining) ?? '' })
      : t('Continue where you stopped')
    : [player.podcast.title, formatLength(listen?.duration ?? null)].filter(Boolean).join(' · ');

  const quote = content.quotes[now.getDate() % content.quotes.length];

  const streakTitle = lib.streak > 0 ? t('{n}-day reading streak', { n: lib.streak }) : t('Start a reading streak');
  const streakText = lib.readToday
    ? t('You’ve read today. See you tomorrow.')
    : lib.streak > 0
      ? t('Read today’s devotional to keep it going.')
      : t('Read today’s devotional to begin.');

  return (
    <Screen gap={28} refreshing={refreshing || content.refreshing} onRefresh={refreshAll}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Eagle height={40} />
          <Text style={styles.brandText}>BTG Ministry</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton icon="bookmark" label={t('Saved')} onPress={() => router.push('/saved')} />
          {auth.session ? (
            <Tap haptic="tap" accessibilityRole="button" accessibilityLabel={t('Your account')} onPress={() => router.push('/profile')} style={styles.avatar}>
              <Text style={styles.avatarText}>{(auth.name ?? auth.email ?? '?').charAt(0).toUpperCase()}</Text>
            </Tap>
          ) : (
            <IconButton icon="user" label={t('Settings and sign in')} onPress={() => router.push('/profile')} />
          )}
        </View>
      </View>

      <Appear>
        <View style={{ gap: 6 }}>
          <Text style={styles.date}>
            {dayName(now.getDay())}, {now.getDate()} {monthName(now.getMonth())}
          </Text>
          <Title size={38}>
            {greeting(now)}
            {firstName ? `, ${firstName}` : ''}.
          </Title>
          <Text style={styles.blessing}>{t('Grace and peace to you.')}</Text>
        </View>
      </Appear>

      {clips.length ? (
        <Appear index={1}>
          <ClipsRail />
        </Appear>
      ) : null}

      <Appear index={1}>
        {loading ? (
          <View style={[styles.liveCard, { gap: 14 }]} accessibilityLabel={t('Loading the latest service')}>
            <Skeleton height={176} radius={16} />
            <Skeleton height={22} width="70%" />
            <Skeleton height={14} width="45%" />
          </View>
        ) : feature ? (
          <Tap
            haptic="tap"
            accessibilityRole="button"
            accessibilityLabel={live ? t('Join the livestream: {title}', { title: feature.title }) : t('Watch the latest service: {title}', { title: feature.title })}
            onPress={() => (live ? router.navigate('/live') : router.push({ pathname: '/sermon/[id]', params: { id: feature.id } }))}
            style={styles.liveCard}>
            <VideoThumb video={feature} height={176} play="center" />
            <View style={styles.liveFooter}>
              <View style={{ gap: 4, flex: 1 }}>
                <Eyebrow style={{ fontSize: 11 }}>
                  {live ? t('Streaming now') : t('Latest service')}
                </Eyebrow>
                <Text style={styles.liveTitle} numberOfLines={2}>
                  {feature.title}
                </Text>
                <Text style={styles.liveMeta}>
                  {live ? 'Iman Mwakanyamale' : next?.scheduledStart ? t('Next live: {when}', { when: formatStart(next.scheduledStart) }) : videoMeta(feature)}
                </Text>
              </View>
              <View style={styles.joinPill}>
                <Text style={styles.joinText}>{live ? t('Join') : t('Watch')}</Text>
              </View>
            </View>
          </Tap>
        ) : null}
      </Appear>

      {notify.showPrompt ? (
        <Appear index={2}>
          <View style={styles.prompt}>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <View style={styles.promptIcon}>
                <Icon name="bell" color={c.accent} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.cardTitle}>{t('Never miss a service')}</Text>
                <Text style={styles.metaText}>{t('Get a notification when we go live, when today’s devotional is posted, and before events.')}</Text>
              </View>
            </View>
            {promptError ? <FormMessage>{promptError}</FormMessage> : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label={notify.busy ? t('Turning on…') : t('Turn on')}
                onPress={async () => {
                  const res = await notify.enable();
                  if (!res.ok) setPromptError(res.error);
                }}
                style={{ flex: 1, minHeight: 46 }}
              />
              <Button label={t('Not now')} variant="outline" onPress={notify.dismissPrompt} style={{ flex: 1, minHeight: 46 }} />
            </View>
          </View>
        </Appear>
      ) : null}

      {nextEvent ? (
        <Appear index={2} style={{ gap: 4 }}>
          <SectionHeader title={t('Coming up')} action={content.upcoming.length > 1 ? t('All events') : undefined} onAction={() => router.push('/events')} />
          <EventCard event={nextEvent} onPress={() => router.push({ pathname: '/events/[id]', params: { id: nextEvent.id } })} />
        </Appear>
      ) : null}

      <Appear index={2} style={{ gap: 4 }}>
        <SectionHeader title={t("Today's devotional")} action={t('See all')} onAction={() => router.navigate('/devotional')} />
        <ScrollCard>
          <View style={styles.rowBetween}>
            <Eyebrow style={{ fontSize: 12 }}>{formatDate(today.date)}</Eyebrow>
            {readToday ? (
              <View style={[styles.refChip, styles.readChip]}>
                <Icon name="check" size={13} color={c.cream} />
                <Text style={[styles.refText, { color: c.cream }]}>{t('Read')}</Text>
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
            <Button label={readToday ? t('Read again') : t('Read now')} variant={readToday ? 'outline' : 'primary'} onPress={openToday} style={{ flex: 1, minHeight: 46 }} />
            {today.audioUrl ? (
              <IconButton
                icon="podcast"
                label={t('Listen to this devotional')}
                size={46}
                onPress={() => {
                  player.play(devotionalEpisode(today));
                  router.push('/player');
                }}
                style={{ borderColor: c.accent, backgroundColor: 'transparent' }}
              />
            ) : null}
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
                <Text style={[styles.dayLetter, d.isToday && { color: c.text, fontFamily: Fonts.sansBold }]}>{weekLetters()[i]}</Text>
              </View>
            ))}
          </View>
          {lib.bestStreak > lib.streak ? <Text style={styles.metaText}>{t('Your best: {n} days in a row', { n: lib.bestStreak })}</Text> : null}
        </Tap>
      </Appear>

      {listen ? (
        <Appear index={4} style={{ gap: 8 }}>
          <SectionHeader title={resume ? t('Continue listening') : t('Listen')} action={t('Podcast')} onAction={() => router.navigate('/podcast')} />
          <View style={styles.listenRow}>
            <Tap
              accessibilityRole="button"
              accessibilityLabel={t('Open the player: {title}', { title: listen.title })}
              onPress={() => router.push('/player')}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={styles.listenArt}>
                <Eagle height={54} />
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
              label={player.playing ? t('Pause') : t('Play {title}', { title: listen.title })}
              variant="solid"
              iconSize={18}
              onPress={() => (player.episode ? player.toggle() : player.play(listen))}
            />
          </View>
        </Appear>
      ) : null}

      <Appear index={5} style={{ gap: 8 }}>
        <SectionHeader title={t('Latest sermons')} action={t('See all')} onAction={() => router.navigate('/sermons')} />
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
          <Eyebrow style={{ fontSize: 12 }}>{t('Word for today')}</Eyebrow>
          <Text style={styles.quoteText}>“{quote}”</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Iman Mwakanyamale</Text>
            <IconButton
              icon="share"
              label={t('Share this word')}
              iconSize={18}
              onPress={() => router.push({ pathname: '/share', params: { kind: 'quote', text: quote, attribution: 'Iman Mwakanyamale' } })}
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
      backgroundColor: c.white,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: Radius.xl,
      padding: 10,
      paddingBottom: 16,
      gap: 14,
      shadowColor: '#3A2413',
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    liveFooter: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 4 },
    liveTitle: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 30, color: c.text },
    liveMeta: { fontFamily: Fonts.sans, fontSize: 14, color: c.textMuted },
    joinPill: { height: 40, paddingHorizontal: 18, borderRadius: Radius.pill, backgroundColor: c.brown, justifyContent: 'center' },
    joinText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.cream },

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
    listenArt: { width: 64, height: 64, borderRadius: 14, backgroundColor: c.artBrown, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
    listenTitle: { fontFamily: Fonts.display, fontSize: 21, lineHeight: 22, color: c.text },
    metaText: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, color: c.textMuted },
    sermonTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, lineHeight: 20, color: c.text },

    prompt: { gap: 14, padding: 18, borderRadius: Radius.lg, backgroundColor: c.parchment, borderWidth: 1, borderColor: c.line },
    promptIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center' },
    quote: { gap: 14, padding: 20, paddingTop: 24, borderRadius: Radius.lg, backgroundColor: c.sand },
    quoteText: { fontFamily: Fonts.displayItalic, fontSize: 24, lineHeight: 29, color: c.brownDark },
  });
