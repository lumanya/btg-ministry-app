import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Eyebrow, Screen, Tap, Title } from '@/components/ui';
import { VideoThumb } from '@/components/video-thumb';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { FeedVideo, videoMeta, videoTone } from '@/lib/video';
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
  const { feed, status, refreshing, refresh } = useFeed();
  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const matches = feed.videos.filter(
    (v) => (filter === 'all' || v.kind === filter) && (!q || `${v.title} ${v.description}`.toLowerCase().includes(q)),
  );
  const [featured, ...rest] = matches;
  const open = (v: FeedVideo) => router.push({ pathname: '/sermon/[id]', params: { id: v.id } });

  return (
    <Screen gap={18} refreshing={refreshing} onRefresh={refresh}>
      <Title>Sermons</Title>

      <View style={styles.search}>
        <Icon name="search" size={20} color={c.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search sermons and teachings"
          placeholderTextColor={c.textSubtle}
          accessibilityLabel="Search sermons"
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
              <Text style={[styles.chipText, on && { color: c.cream }]}>{f.label}</Text>
            </Tap>
          );
        })}
      </ScrollView>

      {status === 'error' ? (
        <Text style={styles.notice} accessibilityLiveRegion="polite">
          Couldn’t reach YouTube. Pull down to try again.
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

      <View style={styles.listHeader}>
        <Eyebrow>{filter === 'all' ? 'Recent' : filters.find((f) => f.id === filter)!.label}</Eyebrow>
        <Text style={styles.meta} accessibilityLiveRegion="polite">
          {matches.length === 1 ? '1 sermon' : `${matches.length} sermons`}
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        {rest.map((v, i) => (
          <Tap key={v.id} accessibilityRole="button" accessibilityLabel={`${v.title}, ${videoMeta(v)}`} onPress={() => open(v)} style={styles.row}>
            <VideoThumb video={v} height={72} titleSize={13} tone={videoTone(i + 1)} radius={12} style={{ width: 124, gap: 8 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.itemTitle} numberOfLines={3}>{v.title}</Text>
              <Text style={styles.meta}>{videoMeta(v)}</Text>
            </View>
          </Tap>
        ))}
        {matches.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.meta}>{q ? 'No sermons match that search.' : 'No sermons here yet.'}</Text>
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
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  empty: { padding: 28, borderRadius: Radius.lg, backgroundColor: c.parchment, alignItems: 'center' },
});
