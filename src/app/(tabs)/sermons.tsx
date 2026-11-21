import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { t } from '@/i18n';
import { Icon } from '@/components/icon';
import { PlaylistCard } from '@/components/playlist-card';
import { Screen, Tap, Title } from '@/components/ui';
import { VideoThumb } from '@/components/video-thumb';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { FeedVideo, formatStart, videoMeta, videoTone } from '@/lib/video';
import { useFeed } from '@/state/feed';
import { useColors, useStyles } from '@/state/theme';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'stream', label: 'Livestreams' },
  { id: 'video', label: 'Videos' },
] as const;

type FilterId = (typeof filters)[number]['id'];

export default function Sermons() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const { feed, status, refreshing, refresh, playlists } = useFeed();
  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const matches = feed.videos.filter(
    (v) => (filter === 'all' || v.kind === filter) && (!q || `${v.title} ${v.subtitle ?? ''} ${v.description}`.toLowerCase().includes(q)),
  );
  const [featured, ...rest] = matches;
  const open = (v: FeedVideo) => router.push({ pathname: '/sermon/[id]', params: { id: v.id } });

  return (
    <Screen gap={18} refreshing={refreshing} onRefresh={refresh}>
      <Title>{t('Watch')}</Title>

      <Tap
        haptic="tap"
        accessibilityRole="button"
        accessibilityLabel={feed.live ? t('Join the livestream: {title}', { title: feed.live.title }) : t('Live services and prayer requests')}
        onPress={() => router.navigate('/live')}
        style={styles.live}>
        <View style={[styles.liveDisc, feed.live && { backgroundColor: c.live }]}>
          <Icon name="live" size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.liveLabel}>{feed.live ? t('Streaming now') : t('Live')}</Text>
          <Text style={styles.liveTitle} numberOfLines={1}>
            {feed.live
              ? feed.live.title
              : feed.upcoming[0]?.scheduledStart
                ? t('Next live: {when}', { when: formatStart(feed.upcoming[0].scheduledStart) })
                : t('Service times and prayer requests')}
          </Text>
        </View>
        <Text style={styles.liveAction}>{feed.live ? t('Join') : t('Open')}</Text>
      </Tap>

      <View style={styles.search}>
        <Icon name="search" size={20} color={c.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('Search sermons and teachings')}
          placeholderTextColor={c.textSubtle}
          accessibilityLabel={t('Search sermons')}
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -ScreenPadding }}
        contentContainerStyle={{ paddingHorizontal: ScreenPadding, gap: 8 }}>
        {filters.map((f) => {
          const on = f.id === filter;
          return (
            <Tap
              key={f.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(f.id)}
              style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && { color: c.cream }]}>{t(f.label)}</Text>
            </Tap>
          );
        })}
      </ScrollView>

      {status === 'error' ? (
        <Text style={styles.notice} accessibilityLiveRegion="polite">
          {t('Couldn’t reach YouTube. Pull down to try again.')}
        </Text>
      ) : null}

      {featured ? (
        <Tap accessibilityRole="button" accessibilityLabel={`${featured.title}, ${videoMeta(featured)}`} onPress={() => open(featured)} style={{ gap: 12 }}>
          <VideoThumb video={featured} height={210} titleSize={30} radius={22} play="corner" />
          <View style={{ gap: 2, paddingHorizontal: 4 }}>
            <Text style={styles.itemTitle}>{featured.title}</Text>
            <Text style={styles.meta}>{videoMeta(featured)}</Text>
          </View>
        </Tap>
      ) : null}

      {playlists.length && !q && filter === 'all' ? (
        <View style={{ gap: 10 }}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle} accessibilityRole="header">{t('Series')}</Text>
            <Text style={styles.meta}>{playlists.length === 1 ? t('1 series') : t('{n} series', { n: playlists.length })}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={220 + 14}
            style={{ marginHorizontal: -ScreenPadding }}
            contentContainerStyle={{ paddingHorizontal: ScreenPadding, gap: 14 }}>
            {playlists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: p.id } })} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.listHeader}>
        <Text style={styles.listTitle} accessibilityRole="header">{filter === 'all' ? t('Recent') : t(filters.find((f) => f.id === filter)!.label)}</Text>
        <Text style={styles.meta} accessibilityLiveRegion="polite">
          {matches.length === 1 ? t('1 sermon') : t('{n} sermons', { n: matches.length })}
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        {rest.map((v, i) => (
          <Tap key={v.id} accessibilityRole="button" accessibilityLabel={`${v.title}, ${videoMeta(v)}`} onPress={() => open(v)} style={styles.row}>
            <VideoThumb video={v} height={72} titleSize={13} tone={videoTone(i + 1)} radius={12} style={{ width: 124, gap: 8 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.itemTitle} numberOfLines={3}>{v.title}</Text>
              {v.subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{v.subtitle}</Text> : null}
              <Text style={styles.meta}>{videoMeta(v)}</Text>
            </View>
          </Tap>
        ))}
        {matches.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.meta}>{q ? t('No sermons match that search.') : t('No sermons here yet.')}</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: c.lineStrong,
    backgroundColor: c.white,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: Fonts.sans, fontSize: 15, color: c.text },
  chip: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: c.lineStrong,
    backgroundColor: c.white,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: c.brown, borderColor: c.brown },
  chipText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.brownDark },
  notice: { fontFamily: Fonts.sans, fontSize: 14, color: c.textMuted, padding: 12, borderRadius: Radius.md, backgroundColor: c.parchment },
  itemTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, lineHeight: 20, color: c.text },
  meta: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
  subtitle: { fontFamily: Fonts.sansMedium, fontSize: 13, color: c.eyebrow },
  listHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 10 },
  listTitle: { fontFamily: Fonts.displayMedium, fontSize: 27, color: c.text },
  live: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 68, paddingHorizontal: 14, borderRadius: Radius.lg, backgroundColor: '#17120E' },
  liveDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  liveLabel: { fontFamily: Fonts.sansSemiBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: '#D4AF73' },
  liveTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: '#FFFFFF' },
  liveAction: { fontFamily: Fonts.sansBold, fontSize: 14, color: '#D4AF73' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  empty: { padding: 28, borderRadius: Radius.lg, backgroundColor: c.parchment, alignItems: 'center' },
});
