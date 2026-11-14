import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Arch, Eagle, useTones } from '@/components/art';
import { Icon } from '@/components/icon';
import { Body, Eyebrow, IconButton, ProgressBar, Screen, Tap, Title } from '@/components/ui';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { ArtTone } from '@/content/sample';
import { Episode, formatLength } from '@/lib/podcast';
import { formatDay } from '@/lib/video';
import { usePlayer } from '@/state/player';
import { useColors, useStyles } from '@/state/theme';

const SERIES_TONES: ArtTone[] = ['deep', 'sand', 'brown'];

export default function PodcastTab() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const toneSet = useTones();
  const router = useRouter();
  const p = usePlayer();
  const [following, setFollowing] = useState(false);
  const [seriesFilter, setSeriesFilter] = useState<string | null>(null);

  const series = [...new Set(p.podcast.episodes.map((e) => e.series).filter((s): s is string => !!s))];
  const episodes = seriesFilter ? p.podcast.episodes.filter((e) => e.series === seriesFilter) : p.podcast.episodes;

  const playEpisode = (e: Episode) => {
    p.play(e);
    if (!e.audioUrl) router.push('/player');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ivory }}>
      <Screen gap={24} refreshing={false} onRefresh={p.status === 'sample' ? undefined : p.refresh}>
        <Title>Podcast</Title>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={[styles.cover, { backgroundColor: c.brown }]}>
            {p.podcast.artwork ? (
              <Image source={{ uri: p.podcast.artwork }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
            ) : (
              <Arch tone="brown" width={108} height={120} eagleHeight={92} />
            )}
          </View>
          <View style={{ flex: 1, justifyContent: 'space-between', gap: 10 }}>
            <View style={{ gap: 6 }}>
              <Title size={26}>{p.podcast.title}</Title>
              <Body style={{ fontSize: 13, lineHeight: 18 }}>
                {p.podcast.description.split('\n')[0] || 'Audio teachings from Iman Mwakanyamale'}
              </Body>
            </View>
            <Tap
              accessibilityRole="button"
              accessibilityState={{ selected: following }}
              onPress={() => setFollowing((f) => !f)}
              style={[styles.follow, following && { backgroundColor: c.brown }]}>
              <Icon name={following ? 'check' : 'plus'} size={16} color={following ? c.cream : c.brownDark} />
              <Text style={[styles.followText, following && { color: c.cream }]}>{following ? 'Following' : 'Follow'}</Text>
            </Tap>
          </View>
        </View>

        {p.status === 'sample' ? (
          <Text style={styles.notice}>Sample episodes. Audio plays here once the podcast feed is connected.</Text>
        ) : p.status === 'error' ? (
          <Text style={styles.notice} accessibilityLiveRegion="polite">Couldn’t load the podcast. Pull down to try again.</Text>
        ) : null}

        {series.length > 1 ? (
          <View style={{ gap: 12 }}>
            <Eyebrow>Series</Eyebrow>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -ScreenPadding }}
              contentContainerStyle={{ paddingHorizontal: ScreenPadding, gap: 12 }}>
              {series.map((name, i) => {
                const tone = SERIES_TONES[i % SERIES_TONES.length];
                const t = toneSet[tone];
                const on = seriesFilter === name;
                return (
                  <Tap
                    key={name}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={on ? `Showing ${name}. Tap to show all episodes` : `Show the ${name} series`}
                    onPress={() => setSeriesFilter(on ? null : name)}
                    style={[styles.seriesCard, { backgroundColor: t.bg }, on && styles.seriesOn]}>
                    <Eagle height={60} light={t.lightEagle} />
                    <Text style={[styles.seriesName, { color: t.text }]}>{name}</Text>
                  </Tap>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View>
          <View style={styles.listHeader}>
            <Eyebrow>{seriesFilter ?? 'Episodes'}</Eyebrow>
            {seriesFilter ? (
              <Tap accessibilityRole="button" onPress={() => setSeriesFilter(null)} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={styles.link}>Show all</Text>
              </Tap>
            ) : null}
          </View>
          {episodes.map((e) => {
            const active = p.episode?.id === e.id && p.playing;
            const saved = p.saved(e.id);
            const meta = [e.date ? formatDay(e.date) : null, formatLength(e.duration), saved?.finished ? 'Played' : null].filter(Boolean).join(' · ');
            const progress = saved && !saved.finished && saved.duration > 0 ? saved.position / saved.duration : 0;
            return (
              <View key={e.id} style={styles.episode}>
                <View style={{ flex: 1, gap: 4 }}>
                  {e.series ? <Text style={styles.episodeSeries}>{e.series}</Text> : null}
                  <Text style={styles.episodeTitle}>{e.title}</Text>
                  {meta ? <Text style={styles.meta}>{meta}</Text> : null}
                  {progress > 0.01 ? (
                    <View style={{ width: 120, paddingTop: 4 }}>
                      <ProgressBar value={progress} />
                    </View>
                  ) : null}
                </View>
                <IconButton
                  icon={active ? 'pause' : 'play'}
                  label={`${active ? 'Pause' : 'Play'} ${e.title}`}
                  variant={active ? 'solid' : 'outline'}
                  iconSize={18}
                  onPress={() => playEpisode(e)}
                  style={!active ? { borderColor: c.accent, backgroundColor: 'transparent' } : undefined}
                />
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
  cover: { width: 132, height: 132, borderRadius: 22, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  follow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: c.accent,
  },
  followText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.brownDark },
  notice: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: c.textMuted, padding: 12, borderRadius: Radius.md, backgroundColor: c.parchment },
  seriesCard: { width: 150, height: 168, borderRadius: Radius.lg, padding: 14, justifyContent: 'space-between' },
  seriesOn: { borderWidth: 3, borderColor: c.gold },
  seriesName: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 25, fontVariant: ['lining-nums'] },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  link: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.accent },
  episode: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line },
  episodeSeries: { fontFamily: Fonts.sansSemiBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: c.eyebrow },
  episodeTitle: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 24, color: c.text },
  meta: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
});
