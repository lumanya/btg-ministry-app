import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eagle } from '@/components/art';
import { Icon } from '@/components/icon';
import { Button, IconButton, Tap } from '@/components/ui';
import { Brand, Fonts, Palette, Radius } from '@/constants/theme';
import { devotionals, findDevotional, formatDate } from '@/content/sample';
import { useColors, useStyles } from '@/state/theme';

const SIZES = [16, 18, 20, 23];

export default function Reader() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const d = findDevotional(id) ?? devotionals[0];
  const index = devotionals.findIndex((x) => x.id === d.id);
  const newer = devotionals[index - 1];
  const older = devotionals[index + 1];

  const [size, setSize] = useState(1);
  const [bookmarked, setBookmarked] = useState(false);
  const [done, setDone] = useState(false);
  const fontSize = SIZES[size];

  const [first, ...rest] = d.excerpt;

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="back" label="Back" variant="plain" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/devotional'))} style={{ marginRight: 'auto' }} />
        <View style={styles.sizeGroup} accessibilityRole="adjustable" accessibilityLabel="Text size">
          <Tap accessibilityRole="button" accessibilityLabel="Smaller text" onPress={() => setSize((s) => Math.max(0, s - 1))} style={styles.sizeBtn}>
            <Text style={[styles.sizeA, { fontSize: 16 }]}>A</Text>
          </Tap>
          <View style={styles.sizeDivider} />
          <Tap accessibilityRole="button" accessibilityLabel="Larger text" onPress={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))} style={styles.sizeBtn}>
            <Text style={[styles.sizeA, { fontSize: 22 }]}>A</Text>
          </Tap>
        </View>
        <IconButton
          icon="bookmark"
          label={bookmarked ? 'Remove bookmark' : 'Bookmark this devotional'}
          variant="plain"
          filled={bookmarked}
          selected={bookmarked}
          onPress={() => setBookmarked((b) => !b)}
        />
        <IconButton icon="share" label="Share this devotional" variant="plain" onPress={() => Share.share({ message: `${d.title} — BTG Ministry daily devotional` })} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: insets.bottom + 40, gap: 22 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 10 }}>
          <Text style={styles.kicker}>Daily devotional · {formatDate(d.date)}</Text>
          <Text style={styles.title} accessibilityRole="header">{d.title}</Text>
          {d.subtitle ? <Text style={styles.subtitle}>{d.subtitle}</Text> : null}
        </View>

        {d.scripture?.text ? (
          <View style={styles.verse}>
            <Eagle height={36} />
            <Text style={styles.verseText}>“{d.scripture.text}”</Text>
            <Text style={styles.verseRef}>{d.scripture.ref} · KJV</Text>
          </View>
        ) : null}

        <View style={{ gap: 16 }}>
          <Text style={[styles.body, { fontSize, lineHeight: fontSize * 1.7 }]}>
            <Text style={styles.dropCap}>{first}</Text>
            {rest.join('')}
          </Text>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>[Full devotional text continues here, loaded from the devotionals published on the website]</Text>
          </View>
        </View>

        <Tap accessibilityRole="button" onPress={() => router.push('/player')} style={styles.listen}>
          <View style={styles.listenDisc}>
            <Icon name="play" size={18} color={c.cream} />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={styles.listenTitle}>Listen to this devotional</Text>
            <Text style={styles.listenMeta}>Read aloud by the ministry</Text>
          </View>
        </Tap>

        {done ? (
          <View style={styles.done} accessibilityLiveRegion="polite">
            <View style={styles.doneDisc}>
              <Icon name="flame" color={Brand.brown} filled />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.doneTitle}>4-day streak</Text>
              <Text style={styles.doneMeta}>Well done. Come back tomorrow for the next word.</Text>
            </View>
            <Tap accessibilityRole="button" accessibilityLabel="Undo mark as read" onPress={() => setDone(false)} style={styles.undo}>
              <Text style={styles.undoText}>Undo</Text>
            </Tap>
          </View>
        ) : (
          <Button label="Mark as read" onPress={() => setDone(true)} style={{ minHeight: 56 }} />
        )}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Previous', item: older },
            { label: 'Next', item: newer },
          ].map(({ label, item }) =>
            item ? (
              <Tap
                key={label}
                accessibilityRole="button"
                accessibilityLabel={`${label} devotional: ${item.title}`}
                onPress={() => router.replace({ pathname: '/devotional/[id]', params: { id: item.id } })}
                style={styles.navCard}>
                <Text style={styles.navLabel}>{label} · {formatDate(item.date).replace(/, \d{4}$/, '')}</Text>
                <Text style={styles.navTitle}>{item.title}</Text>
              </Tap>
            ) : (
              <View key={label} style={{ flex: 1 }} />
            ),
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.sand },
  sizeGroup: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.lineStrong, borderRadius: Radius.pill },
  sizeBtn: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  sizeA: { fontFamily: Fonts.display, color: c.brownDark },
  sizeDivider: { width: 1, height: 20, backgroundColor: c.lineStrong },
  kicker: { fontFamily: Fonts.sansSemiBold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: c.eyebrow },
  title: { fontFamily: Fonts.display, fontSize: 48, lineHeight: 48, color: c.text },
  subtitle: { fontFamily: Fonts.displayItalic, fontSize: 22, color: c.textMuted },
  verse: { alignItems: 'center', gap: 12, padding: 24, paddingHorizontal: 20, borderRadius: Radius.lg, backgroundColor: c.white, borderWidth: 1, borderColor: c.line },
  verseText: { fontFamily: Fonts.displayItalic, fontSize: 23, lineHeight: 29, color: c.brownDark, textAlign: 'center' },
  verseRef: { fontFamily: Fonts.sansBold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: c.eyebrow },
  body: { fontFamily: Fonts.sans, color: c.text },
  dropCap: { fontFamily: Fonts.display, fontSize: 40, color: c.accent },
  placeholder: { padding: 18, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.inputBorder },
  placeholderText: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21, color: c.textMuted },
  listen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    paddingRight: 16,
    borderRadius: 18,
    backgroundColor: c.parchment,
    borderWidth: 1,
    borderColor: c.line,
  },
  listenDisc: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brown, alignItems: 'center', justifyContent: 'center' },
  listenTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: c.text },
  listenMeta: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
  done: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: Radius.lg, backgroundColor: c.brown },
  doneDisc: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.cream, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 25, color: c.cream },
  doneMeta: { fontFamily: Fonts.sans, fontSize: 13, color: c.creamMuted },
  undo: { minHeight: 44, paddingHorizontal: 12, borderRadius: Radius.pill, borderWidth: 1, borderColor: c.gold, justifyContent: 'center' },
  undoText: { fontFamily: Fonts.sansSemiBold, fontSize: 13, color: c.cream },
  navCard: { flex: 1, gap: 6, padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.white },
  navLabel: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: c.eyebrow },
  navTitle: { fontFamily: Fonts.display, fontSize: 19, lineHeight: 21, color: c.text },
});
