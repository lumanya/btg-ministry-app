import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SermonArt } from '@/components/art';
import { Icon } from '@/components/icon';
import { Eyebrow, Screen, Tap, Title } from '@/components/ui';
import { Colors, Fonts, Radius, ScreenPadding } from '@/constants/theme';
import { Sermon, sermons } from '@/content/sample';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'sunday', label: 'Sunday services' },
  { id: 'teaching', label: 'Teachings' },
] as const;

type FilterId = (typeof filters)[number]['id'];

export default function Sermons() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const featured = sermons[0];
  const list = sermons.filter(
    (s) => (filter === 'all' || s.kind === filter) && (!q || `${s.title} ${s.meta}`.toLowerCase().includes(q)),
  );
  const showFeatured = filter !== 'teaching' && !q;
  const open = (s: Sermon) => router.push({ pathname: '/sermon/[id]', params: { id: s.id } });

  return (
    <Screen gap={18}>
      <Title>Sermons</Title>

      <View style={styles.search}>
        <Icon name="search" size={20} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search sermons and teachings"
          placeholderTextColor={Colors.textSubtle}
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
              <Text style={[styles.chipText, on && { color: Colors.cream }]}>{f.label}</Text>
            </Tap>
          );
        })}
      </ScrollView>

      {showFeatured ? (
        <Tap accessibilityRole="button" accessibilityLabel={`Featured: ${featured.title}`} onPress={() => open(featured)} style={{ gap: 12 }}>
          <SermonArt title={featured.title} tone="deep" height={210} titleSize={30} style={{ borderRadius: 22 }}>
            <View style={styles.featuredPlay}>
              <Icon name="play" size={20} color={Colors.brown} />
            </View>
          </SermonArt>
          <View style={{ gap: 2, paddingHorizontal: 4 }}>
            <Text style={styles.itemTitle}>{featured.title}</Text>
            <Text style={styles.meta}>{featured.meta} · Iman Mwakanyamale</Text>
          </View>
        </Tap>
      ) : null}

      <View style={styles.listHeader}>
        <Eyebrow>{filter === 'all' ? 'Recent' : filters.find((f) => f.id === filter)!.label}</Eyebrow>
        <Text style={styles.meta} accessibilityLiveRegion="polite">
          {list.length === 1 ? '1 sermon' : `${list.length} sermons`}
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        {list.map((s) => (
          <Tap key={s.id} accessibilityRole="button" accessibilityLabel={`${s.title}, ${s.meta}`} onPress={() => open(s)} style={styles.row}>
            <SermonArt title={s.shortTitle} tone={s.tone} height={72} titleSize={13} style={{ width: 124, borderRadius: 12, gap: 8 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.itemTitle}>{s.title}</Text>
              <Text style={styles.meta}>{s.meta}</Text>
            </View>
          </Tap>
        ))}
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.meta}>No sermons match that search.</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.lineStrong,
    backgroundColor: Colors.white,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: Fonts.sans, fontSize: 15, color: Colors.text },
  chip: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.lineStrong,
    backgroundColor: Colors.white,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: Colors.brown, borderColor: Colors.brown },
  chipText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Colors.brownDark },
  featuredPlay: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, lineHeight: 20, color: Colors.text },
  meta: { fontFamily: Fonts.sans, fontSize: 13, color: Colors.textMuted },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  empty: { padding: 28, borderRadius: Radius.lg, backgroundColor: Colors.parchment, alignItems: 'center' },
});
