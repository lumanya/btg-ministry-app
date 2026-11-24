import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { dayName, monthName, t } from '@/i18n';
import { Eagle } from '@/components/art';
import { ComingUpRail } from '@/components/event-poster';
import { FormMessage } from '@/components/form';
import { Icon, IconName } from '@/components/icon';
import { Appear, Pop, Skeleton } from '@/components/motion';
import { SeedsRail } from '@/components/seeds-rail';
import { Button, IconButton, Screen, SectionHeader, Tap } from '@/components/ui';
import { UpdateBanner } from '@/components/update-banner';
import { VideoThumb } from '@/components/video-thumb';
import { Fonts, Palette } from '@/constants/theme';
import { seedTitle } from '@/lib/clips';
import { formatLength } from '@/lib/podcast';
import { setupDone } from '@/lib/reminder';
import { formatStart, videoMeta } from '@/lib/video';
import { useAuth } from '@/state/auth';
import { useClips } from '@/state/clips';
import { useContent } from '@/state/content';
import { useFeed } from '@/state/feed';
import { useLibrary } from '@/state/library';
import { useNotifications } from '@/state/notifications';
import { usePlayer } from '@/state/player';
import { useRhythm } from '@/state/rhythm';
import { useColors, useStyles, useTheme } from '@/state/theme';

/** Fixed colours for the rhythm panel: the same deep ink in light and dark mode. */
const INK = '#17120E';
const GOLD = '#D4AF73';
const SOFT = 'rgba(255,255,255,0.70)';
const RULE = 'rgba(255,255,255,0.10)';

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 12) return t('Good morning');
  if (h < 17) return t('Good afternoon');
  return t('Good evening');
}

export default function Today() {
  const c = useColors();
  const { isDark } = useTheme();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const auth = useAuth();
  const lib = useLibrary();
  const rhythm = useRhythm();
  const content = useContent();
  const notify = useNotifications();
  const player = usePlayer();
  const { clips } = useClips();
  const [promptError, setPromptError] = useState<string | null>(null);
  const { feed, status, refreshing, refresh } = useFeed();
  const refreshAll = () => {
    refresh();
    content.refresh();
  };

  // First time on Today (on a phone): ask when to send the daily reminder.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setupDone().then((done) => {
        if (!done && !cancelled) router.push('/setup');
      });
    }, 900);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]);

  const now = new Date();
  const firstName = auth.name?.split(' ')[0];
  const loading = status === 'loading';

  const live = feed.live;
  const next = feed.upcoming[0];
  // While live, feature the stream; otherwise the most recent service.
  const feature = live ?? feed.videos.find((v) => v.kind === 'stream') ?? feed.videos[0];

  const today = content.today;
  const openToday = () => router.push({ pathname: '/devotional/[id]', params: { id: today.id } });
  const seed = clips[0];
  const openSeed = () => router.navigate(seed ? { pathname: '/seeds', params: { start: seed.id, at: String(Date.now()) } } : '/seeds');

  const steps: { key: string; label: string; title: string; icon: IconName; done: boolean; onPress: () => void }[] = [
    { key: 'read', label: t('Read'), title: today.title, icon: 'devotional', done: lib.readToday, onPress: openToday },
    { key: 'seed', label: t('Watch a seed'), title: seed ? seedTitle(seed.title) : t('One minute with the Word'), icon: 'seed', done: rhythm.seedToday, onPress: openSeed },
    { key: 'pray', label: t('Pray'), title: t('A minute of prayer'), icon: 'heart', done: rhythm.prayedToday, onPress: () => router.push('/pray') },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const nextKey = steps.find((s) => !s.done)?.key;

  const streakLine = lib.streak > 0 ? t('{n}-day streak', { n: lib.streak }) : t('Start your streak today');
  const graceLine = lib.streak > 0 ? (lib.graceReady ? t('grace day ready') : t('grace day used this week')) : null;

  const resume = player.resume;
  const listen = resume?.episode ?? player.podcast.episodes[0];
  const remaining = resume && resume.duration > 0 ? resume.duration - resume.position : 0;
  const listenMeta = resume
    ? remaining > 60
      ? t('{time} left', { time: formatLength(remaining) ?? '' })
      : t('Continue where you stopped')
    : [player.podcast.title, formatLength(listen?.duration ?? null)].filter(Boolean).join(' · ');

  const quote = content.quotes[now.getDate() % content.quotes.length];

  return (
    <Screen gap={36} refreshing={refreshing || content.refreshing} onRefresh={refreshAll}>
      <View style={styles.topBar}>
        <View style={styles.brand} accessibilityRole="header" accessibilityLabel="BTG Ministry">
          <Eagle height={34} />
          <Text style={styles.brandText}>BTG</Text>
          <Text style={styles.brandSmall}>MINISTRY</Text>
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

      <UpdateBanner />

      {/* The greeting heads the rhythm card, so the day's three steps start near the top. */}
      <Appear style={{ marginTop: -14 }}>
        <View style={[styles.rhythm, { borderColor: isDark ? 'rgba(255,255,255,0.10)' : INK }]}>
          <View style={styles.rhythmHead}>
            <Text style={styles.date}>
              {dayName(now.getDay())} · {now.getDate()} {monthName(now.getMonth())}
            </Text>
            <Text style={styles.rhythmCount}>{doneCount === 3 ? t('Complete') : t('{n} of 3', { n: doneCount })}</Text>
          </View>
          <Text style={styles.rhythmTitle} accessibilityRole="header">
            {greeting(now)}
            {firstName ? `, ${firstName}` : ''}
          </Text>
          <Text style={styles.rhythmSub}>{t('Three small steps with the Word.')}</Text>
          <View style={{ marginTop: 10 }}>
            {steps.map((s) => (
              <Tap
                key={s.key}
                haptic="tap"
                accessibilityRole="button"
                accessibilityLabel={`${s.label}: ${s.title}${s.done ? `, ${t('done')}` : ''}`}
                onPress={s.onPress}
                style={styles.step}>
                <Pop trigger={s.done ? 1 : 0}>
                  <View style={[styles.stepDisc, s.done ? styles.stepDone : s.key === nextKey ? styles.stepNext : styles.stepLater]}>
                    <Icon name={s.done ? 'check' : s.icon} size={18} color={s.done ? INK : s.key === nextKey ? GOLD : SOFT} />
                  </View>
                </Pop>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.stepLabel, !s.done && s.key !== nextKey && { color: SOFT }]}>{s.label}</Text>
                  <Text style={[styles.stepTitle, s.done && styles.stepTitleDone]} numberOfLines={1}>
                    {s.title}
                  </Text>
                </View>
                {s.done ? null : <Icon name="chevron" size={18} color={SOFT} />}
              </Tap>
            ))}
          </View>
          <Tap accessibilityRole="button" accessibilityLabel={`${streakLine}${graceLine ? `, ${graceLine}` : ''}`} onPress={() => router.push('/rhythm')} style={styles.streakRow}>
            <Icon name="flame" size={16} color={GOLD} filled={lib.streak > 0} />
            <Text style={styles.streakText}>{streakLine}</Text>
            {graceLine ? <Text style={styles.graceText}>· {graceLine}</Text> : null}
          </Tap>
        </View>
      </Appear>

      {clips.length ? (
        <Appear index={2}>
          <SeedsRail />
        </Appear>
      ) : null}

      {content.upcoming.length ? (
        <Appear index={2}>
          <ComingUpRail
            events={content.upcoming}
            onOpen={(id) => router.push({ pathname: '/events/[id]', params: { id } })}
            onAll={() => router.push('/events')}
          />
        </Appear>
      ) : null}

      {notify.showPrompt ? (
        <Appear index={2}>
          <View style={styles.prompt}>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <Icon name="bell" color={c.accent} />
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

      <Appear index={3} style={{ gap: 14 }}>
        <SectionHeader title={live ? t('Streaming now') : t('Latest service')} action={t('All sermons')} onAction={() => router.navigate('/sermons')} />
        {loading ? (
          <View style={{ gap: 12 }} accessibilityLabel={t('Loading the latest service')}>
            <Skeleton height={200} radius={20} />
            <Skeleton height={24} width="75%" />
            <Skeleton height={14} width="45%" />
          </View>
        ) : feature ? (
          <Tap
            haptic="tap"
            accessibilityRole="button"
            accessibilityLabel={live ? t('Join the livestream: {title}', { title: feature.title }) : t('Watch the latest service: {title}', { title: feature.title })}
            onPress={() => (live ? router.navigate('/live') : router.push({ pathname: '/sermon/[id]', params: { id: feature.id } }))}
            style={{ gap: 12 }}>
            <VideoThumb video={feature} height={200} radius={20} play="center" />
            <View style={{ gap: 4 }}>
              <Text style={styles.serviceTitle} numberOfLines={2}>
                {feature.title}
              </Text>
              <Text style={styles.metaText}>
                {live ? 'Iman Mwakanyamale' : next?.scheduledStart ? t('Next live: {when}', { when: formatStart(next.scheduledStart) }) : videoMeta(feature)}
              </Text>
            </View>
          </Tap>
        ) : null}
      </Appear>

      {listen ? (
        <Appear index={4}>
          <View style={styles.listenRow}>
            <Tap
              accessibilityRole="button"
              accessibilityLabel={t('Open the player: {title}', { title: listen.title })}
              onPress={() => router.push('/player')}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={styles.listenArt}>
                {listen.artwork ?? player.podcast.artwork ? (
                  <Image source={{ uri: (listen.artwork ?? player.podcast.artwork)! }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessible={false} />
                ) : (
                  <Text style={styles.listenArtText}>BTG</Text>
                )}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.listenLabel}>{resume ? t('Continue listening') : t('New on the podcast')}</Text>
                <Text style={styles.listenTitle} numberOfLines={1}>
                  {listen.title}
                </Text>
                {listen.subtitle && !(resume && resume.duration > 0) ? (
                  <Text style={styles.metaText} numberOfLines={1}>
                    {listen.subtitle}
                  </Text>
                ) : null}
                {resume && resume.duration > 0 ? (
                  <View style={styles.listenTrack}>
                    <View style={[styles.listenFill, { width: `${Math.round((resume.position / resume.duration) * 100)}%` }]} />
                  </View>
                ) : (
                  <Text style={styles.metaText} numberOfLines={1}>
                    {listenMeta}
                  </Text>
                )}
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

      <Appear index={5} style={{ gap: 12 }}>
        <Text style={styles.quoteMark} accessible={false}>
          “
        </Text>
        <Text style={styles.quoteText}>{quote}</Text>
        <View style={styles.quoteFoot}>
          <Text style={styles.cardTitle}>Iman Mwakanyamale</Text>
          <Tap
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/share', params: { kind: 'quote', text: quote, attribution: 'Iman Mwakanyamale', format: 'status', theme: 'ink' } })}
            style={styles.statusButton}>
            <Icon name="share" size={16} color={c.accent} />
            <Text style={styles.statusText}>{t('Share to Status')}</Text>
          </Tap>
        </View>
      </Appear>
    </Screen>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    brandText: { fontFamily: Fonts.display, fontSize: 26, letterSpacing: 1.5, color: c.text },
    brandSmall: { fontFamily: Fonts.sansSemiBold, fontSize: 10, letterSpacing: 2.8, color: c.textMuted, marginTop: 4 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brown, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: Fonts.display, fontSize: 22, color: c.cream },
    date: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: GOLD },

    rhythm: { marginHorizontal: -4, backgroundColor: INK, borderRadius: 28, borderWidth: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 },
    rhythmHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rhythmTitle: { fontFamily: Fonts.displayMedium, fontSize: 32, lineHeight: 36, color: '#FFFFFF', marginTop: 6 },
    rhythmCount: { fontFamily: Fonts.sans, fontSize: 13, color: SOFT },
    rhythmSub: { fontFamily: Fonts.sans, fontSize: 14, color: SOFT, marginTop: 4 },
    step: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 62, borderTopWidth: 1, borderTopColor: RULE },
    stepDisc: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    stepDone: { backgroundColor: GOLD },
    stepNext: { borderWidth: 1.5, borderColor: GOLD },
    stepLater: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
    stepLabel: { fontFamily: Fonts.sansSemiBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: GOLD },
    stepTitle: { fontFamily: Fonts.sansMedium, fontSize: 16, color: '#FFFFFF' },
    stepTitleDone: { color: SOFT, textDecorationLine: 'line-through' },
    streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, borderTopWidth: 1, borderTopColor: RULE },
    streakText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: '#FFFFFF' },
    graceText: { fontFamily: Fonts.sans, fontSize: 14, color: SOFT, flexShrink: 1 },

    prompt: { gap: 14, paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line },
    cardTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: c.text },
    metaText: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 19, color: c.textMuted },
    serviceTitle: { fontFamily: Fonts.display, fontSize: 27, lineHeight: 29, color: c.text },

    listenRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line },
    listenArt: { width: 64, height: 64, borderRadius: 12, backgroundColor: INK, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    listenArtText: { fontFamily: Fonts.display, fontSize: 18, letterSpacing: 1, color: GOLD },
    listenLabel: { fontFamily: Fonts.sansSemiBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: c.eyebrow },
    listenTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 16, color: c.text },
    listenTrack: { height: 3, borderRadius: 2, backgroundColor: c.rail, overflow: 'hidden', marginTop: 2 },
    listenFill: { height: 3, backgroundColor: c.brown },

    quoteMark: { fontFamily: Fonts.display, fontSize: 84, lineHeight: 70, height: 40, color: c.goldLine },
    quoteText: { fontFamily: Fonts.displayItalic, fontSize: 27, lineHeight: 32, color: c.text },
    quoteFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    statusButton: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: c.accent },
    statusText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.accent },
  });
