import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { Eagle, useTones } from '@/components/art';
import { DownloadButton } from '@/components/download-button';
import { EagleMark } from '@/components/eagle-mark';
import { Icon } from '@/components/icon';
import { IconButton, ProgressBar, Screen, Tap, SectionHeader } from '@/components/ui';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { ArtTone } from '@/content/sample';
import { Episode, formatLength } from '@/lib/podcast';
import { formatDay } from '@/lib/video';
import { useDataSaver } from '@/state/data-saver';
import { formatBytes, useDownloads } from '@/state/downloads';
import { usePlayer } from '@/state/player';
import { useColors, useStyles } from '@/state/theme';

const SERIES_TONES: ArtTone[] = ['deep', 'sand', 'brown'];
const INK = '#17120E';
const GOLD = '#D4AF73';
const SPOTIFY_URL = process.env.EXPO_PUBLIC_PODCAST_SPOTIFY_URL;

/** Square artwork: the episode's, else the show's, else the gold eagle on ink. */
function Artwork({ uri, size, radius }: { uri: string | null; size: number; radius: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: INK, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessible={false} />
      ) : (
        <EagleMark height={size * 0.6} />
      )}
    </View>
  );
}

export default function PodcastTab() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const toneSet = useTones();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const [moreAbout, setMoreAbout] = useState(false);
  // The header is dark: light status bar while this tab is open.
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const [seriesFilter, setSeriesFilter] = useState<string | null>(null);
  const [showDownloads, setShowDownloads] = useState(false);
  const downloads = useDownloads();
  const { online } = useDataSaver();

  const series = [...new Set(p.podcast.episodes.map((e) => e.series).filter((s): s is string => !!s))];
  // Offline, or when asked: only what's saved on the phone.
  const onlyDownloads = (showDownloads || !online) && downloads.list.length > 0;
  const episodes = onlyDownloads
    ? downloads.list.map((d) => d.episode)
    : seriesFilter
      ? p.podcast.episodes.filter((e) => e.series === seriesFilter)
      : p.podcast.episodes;

  const playEpisode = (e: Episode) => {
    p.play(e);
    if (!e.audioUrl) router.push('/player');
  };

  // The big button: resume what was playing, else the newest episode.
  const resumable = p.resume && !p.saved(p.resume.episode.id)?.finished ? p.resume.episode : null;
  const latest = resumable ?? p.podcast.episodes[0] ?? null;
  const mainPlaying = !!latest && p.playing && p.episode?.id === latest.id;
  const mainLabel = mainPlaying ? t('Pause') : resumable && (p.resume?.position ?? 0) > 5 ? t('Resume') : t('Play latest');
  const playMain = () => {
    if (!latest) return;
    if (p.episode?.id === latest.id) p.toggle();
    else playEpisode(latest);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ivory }}>
      {focused ? <StatusBar style="light" /> : null}
      <Screen gap={24} refreshing={false} onRefresh={p.status === 'sample' ? undefined : p.refresh} contentStyle={{ paddingTop: 0 }}>
        <View style={[styles.hero, { paddingTop: insets.top + 28 }]}>
          <View style={styles.heroCover}>
            <Artwork uri={p.podcast.artwork} size={196} radius={20} />
          </View>
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={styles.heroEyebrow}>{t('Podcast')}</Text>
            <Text style={styles.heroTitle} accessibilityRole="header">
              {p.podcast.title}
            </Text>
            <Text style={styles.heroMeta}>
              {['Iman Mwakanyamale', p.podcast.episodes.length === 1 ? t('1 episode') : t('{n} episodes', { n: p.podcast.episodes.length })].join(' · ')}
            </Text>
          </View>
          {latest ? (
            <View style={styles.heroActions}>
              <Tap haptic="tap" accessibilityRole="button" onPress={playMain} style={styles.playMain}>
                <Icon name={mainPlaying ? 'pause' : 'play'} size={18} color={INK} filled />
                <Text style={styles.playMainText}>{mainLabel}</Text>
              </Tap>
              {SPOTIFY_URL ? (
                <Tap
                  haptic="tap"
                  accessibilityRole="link"
                  accessibilityLabel={t('Open in Spotify')}
                  onPress={() => WebBrowser.openBrowserAsync(SPOTIFY_URL)}
                  style={styles.spotify}>
                  <Text style={styles.spotifyText}>Spotify</Text>
                  <Icon name="arrow" size={16} color={GOLD} />
                </Tap>
              ) : null}
            </View>
          ) : null}
        </View>

        {p.podcast.description ? (
          <Tap accessibilityRole="button" accessibilityLabel={moreAbout ? t('Show less') : t('Read more')} onPress={() => setMoreAbout((v) => !v)} style={{ gap: 6 }}>
            <Text style={styles.about} numberOfLines={moreAbout ? undefined : 3}>
              {p.podcast.description}
            </Text>
            <Text style={styles.link}>{moreAbout ? t('Show less') : t('Read more')}</Text>
          </Tap>
        ) : null}

        {p.status === 'sample' ? (
          <Text style={styles.notice}>{t('Sample episodes. Audio plays here once the podcast feed is connected.')}</Text>
        ) : p.status === 'error' ? (
          <Text style={styles.notice} accessibilityLiveRegion="polite">{t('Couldn’t load the podcast. Pull down to try again.')}</Text>
        ) : null}

        {downloads.list.length ? (
          <Tap
            accessibilityRole="button"
            accessibilityState={{ selected: onlyDownloads }}
            onPress={() => setShowDownloads((v) => !v)}
            style={[styles.downloads, onlyDownloads && { borderColor: c.accent }]}>
            <Icon name="download" size={20} color={c.accent} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.downloadsTitle}>{t('Downloads')}</Text>
              <Text style={styles.meta}>
                {downloads.list.length === 1 ? t('1 episode') : t('{n} episodes', { n: downloads.list.length })} · {formatBytes(downloads.totalBytes)}
                {!online ? ` · ${t('No internet: showing your downloads')}` : ''}
              </Text>
            </View>
            <Text style={styles.link}>{onlyDownloads ? (online ? t('Show all') : '') : t('Show')}</Text>
          </Tap>
        ) : null}

        {series.length > 1 && !onlyDownloads ? (
          <View style={{ gap: 12 }}>
            <SectionHeader small title={t('Series')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -ScreenPadding }}
              contentContainerStyle={{ paddingHorizontal: ScreenPadding, gap: 12 }}>
              {series.map((name, i) => {
                const tone = SERIES_TONES[i % SERIES_TONES.length];
                const tn = toneSet[tone];
                const on = seriesFilter === name;
                return (
                  <Tap
                    key={name}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={on ? t('Showing {name}. Tap to show all episodes', { name }) : t('Show the {name} series', { name })}
                    onPress={() => setSeriesFilter(on ? null : name)}
                    style={[styles.seriesCard, { backgroundColor: tn.bg }, on && styles.seriesOn]}>
                    <Eagle height={60} light={tn.lightEagle} />
                    <Text style={[styles.seriesName, { color: tn.text }]}>{name}</Text>
                  </Tap>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View>
          <View style={styles.listHeader}>
            <SectionHeader small title={onlyDownloads ? t('Downloads') : (seriesFilter ?? t('Episodes'))} />
            {seriesFilter && !onlyDownloads ? (
              <Tap accessibilityRole="button" onPress={() => setSeriesFilter(null)} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={styles.link}>{t('Show all')}</Text>
              </Tap>
            ) : null}
          </View>
          {episodes.map((e) => {
            const active = p.episode?.id === e.id && p.playing;
            const saved = p.saved(e.id);
            const meta = [e.date ? formatDay(e.date) : null, formatLength(e.duration), saved?.finished ? t('Played') : null].filter(Boolean).join(' · ');
            const progress = saved && !saved.finished && saved.duration > 0 ? saved.position / saved.duration : 0;
            return (
              <View key={e.id} style={styles.episode}>
                <Tap accessibilityRole="button" accessibilityLabel={`${active ? t('Pause') : t('Play')} ${e.title}`} onPress={() => (p.episode?.id === e.id ? p.toggle() : playEpisode(e))} style={styles.episodeMain}>
                  <View>
                    <Artwork uri={e.artwork ?? p.podcast.artwork} size={72} radius={12} />
                    {active ? (
                      <View style={styles.nowPlaying}>
                        <Icon name="pause" size={16} color="#FFFFFF" filled />
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    {e.series ? <Text style={styles.episodeSeries}>{e.series}</Text> : null}
                    <Text style={styles.episodeTitle} numberOfLines={2}>
                      {e.title}
                    </Text>
                    {e.subtitle ? (
                      <Text style={styles.episodeSubtitle} numberOfLines={1}>
                        {e.subtitle}
                      </Text>
                    ) : null}
                    {meta ? <Text style={styles.meta}>{meta}</Text> : null}
                    {progress > 0.01 ? (
                      <View style={{ paddingTop: 4, paddingRight: 8 }}>
                        <ProgressBar value={progress} />
                      </View>
                    ) : null}
                  </View>
                </Tap>
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <IconButton
                    icon={active ? 'pause' : 'play'}
                    label={`${active ? t('Pause') : t('Play')} ${e.title}`}
                    variant={active ? 'solid' : 'outline'}
                    iconSize={18}
                    onPress={() => (p.episode?.id === e.id ? p.toggle() : playEpisode(e))}
                    style={!active ? { borderColor: c.accent, backgroundColor: 'transparent' } : undefined}
                  />
                  <DownloadButton episode={e} />
                </View>
              </View>
            );
          })}
        </View>
      </Screen>

    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  hero: {
    marginHorizontal: -ScreenPadding,
    paddingHorizontal: ScreenPadding,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 18,
    backgroundColor: INK,
    backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(212,175,115,0.22) 0%, rgba(23,18,14,0) 60%)',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroCover: { borderRadius: 20, boxShadow: '0 16px 40px rgba(0,0,0,0.45)' },
  heroEyebrow: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase', color: GOLD },
  heroTitle: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 34, color: '#FFFFFF', textAlign: 'center' },
  heroMeta: { fontFamily: Fonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.68)', textAlign: 'center' },
  heroActions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', justifyContent: 'center' },
  playMain: { flex: 1, maxWidth: 220, height: 50, borderRadius: Radius.pill, backgroundColor: GOLD, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  playMainText: { fontFamily: Fonts.sansBold, fontSize: 15, color: INK },
  spotify: { height: 50, paddingHorizontal: 20, borderRadius: Radius.pill, borderWidth: 1, borderColor: 'rgba(212,175,115,0.55)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  spotifyText: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: GOLD },
  about: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 23, color: c.textMuted },
  notice: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: c.textMuted, padding: 12, borderRadius: Radius.md, backgroundColor: c.parchment },
  seriesCard: { width: 150, height: 168, borderRadius: Radius.lg, padding: 14, justifyContent: 'space-between' },
  seriesOn: { borderWidth: 3, borderColor: c.gold },
  seriesName: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 25, fontVariant: ['lining-nums'] },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  link: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.accent },
  downloads: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.white },
  downloadsTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: c.text },
  episode: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line },
  episodeMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  nowPlaying: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12, backgroundColor: 'rgba(23,18,14,0.55)', alignItems: 'center', justifyContent: 'center' },
  episodeSubtitle: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
  episodeSeries: { fontFamily: Fonts.sansSemiBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: c.eyebrow },
  episodeTitle: { fontFamily: Fonts.display, fontSize: 20, lineHeight: 22, color: c.text },
  meta: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
});
