import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Eagle, ScrollCard, tones } from '@/components/art';
import { Icon } from '@/components/icon';
import { Body, Button, Eyebrow, IconButton, Screen, Tap, Title } from '@/components/ui';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { devotionals, formatDate, podcast, todaysDevotionalId } from '@/content/sample';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The seven days ending on the newest devotional, so the strip always has content. */
function buildWeek() {
  const newest = new Date(`${devotionals[0].date}T12:00:00`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(newest);
    d.setDate(newest.getDate() - (6 - i));
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { iso, day: d.getDate(), weekday: WEEKDAYS[d.getDay()], devotional: devotionals.find((x) => x.date === iso) };
  });
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function DevotionalTab() {
  const router = useRouter();
  const week = buildWeek();
  const [selectedId, setSelectedId] = useState(todaysDevotionalId);
  const selected = devotionals.find((d) => d.id === selectedId)!;
  const [y, m] = week[6].iso.split('-').map(Number);
  const weekIds = new Set(week.map((w) => w.devotional?.id));
  const earlier = devotionals.filter((d) => !weekIds.has(d.id));

  const open = (id: string) => router.push({ pathname: '/devotional/[id]', params: { id } });

  return (
    <Screen gap={22}>
      <View style={styles.header}>
        <Title size={34}>Daily devotional</Title>
        <View style={styles.streak} accessible accessibilityLabel="3-day reading streak">
          <Icon name="flame" size={16} color={Colors.brown} filled />
          <Text style={styles.streakText}>3</Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Eyebrow>{`${MONTHS[m - 1]} ${y}`}</Eyebrow>
        <View style={styles.week}>
          {week.map((w) => {
            const d = w.devotional;
            const on = d?.id === selectedId;
            return (
              <Tap
                key={w.iso}
                disabled={!d}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: !d }}
                accessibilityLabel={`${w.weekday} ${w.day}: ${d ? d.title : 'no devotional'}`}
                onPress={() => d && setSelectedId(d.id)}
                style={[styles.day, on && styles.dayOn, !d && styles.dayEmpty]}>
                <Text style={[styles.dayLetter, on && { color: Colors.cream }]}>{w.weekday.charAt(0)}</Text>
                <Text style={[styles.dayNum, on && { color: Colors.cream }, !d && { color: Colors.textSubtle }]}>{w.day}</Text>
                <View style={[styles.dayDot, d && { backgroundColor: on ? Colors.gold : Colors.brown }]} />
              </Tap>
            );
          })}
        </View>
      </View>

      <View accessibilityLiveRegion="polite">
        <ScrollCard>
          <View style={styles.rowBetween}>
            <Eyebrow style={{ fontSize: 12 }}>{formatDate(selected.date)}</Eyebrow>
            {selected.scripture ? (
              <View style={styles.refChip}>
                <Text style={styles.refText}>{selected.scripture.ref}</Text>
              </View>
            ) : null}
          </View>
          <Title size={30}>{selected.title}</Title>
          <Body>{selected.excerpt}</Body>
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
            <Button label="Read" onPress={() => open(selected.id)} style={{ flex: 1, minHeight: 46 }} />
            <IconButton
              icon="podcast"
              label="Listen to this devotional"
              size={46}
              onPress={() => router.push('/player')}
              style={{ borderColor: Colors.brown, backgroundColor: 'transparent' }}
            />
          </View>
        </ScrollCard>
      </View>

      <View style={{ gap: 12 }}>
        <Eyebrow>Series</Eyebrow>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {podcast.series.map((s) => {
            const t = tones[s.tone];
            const first = devotionals.find((d) => d.series === s.name);
            return (
              <Tap
                key={s.name}
                accessibilityRole="button"
                accessibilityLabel={`${s.name} series`}
                onPress={() => first && setSelectedId(first.id)}
                style={[styles.series, { backgroundColor: t.bg }]}>
                <Eagle height={30} light={s.tone !== 'sand'} />
                <Text style={[styles.seriesName, { color: t.text }]}>{s.name}</Text>
              </Tap>
            );
          })}
        </View>
      </View>

      <View>
        <Eyebrow style={{ marginBottom: 4 }}>Earlier</Eyebrow>
        {earlier.map((d) => (
          <Tap key={d.id} accessibilityRole="button" accessibilityLabel={`${d.title}, ${formatDate(d.date)}`} onPress={() => open(d.id)} style={styles.earlier}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.earlierDate}>{formatDate(d.date)}</Text>
              <Text style={styles.earlierTitle}>{d.title}</Text>
            </View>
            <Icon name="chevron" size={18} color={Colors.brown} />
          </Tap>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.parchment,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  streakText: { fontFamily: Fonts.sansBold, fontSize: 14, color: Colors.brown },
  week: { flexDirection: 'row', gap: 4 },
  day: {
    flex: 1,
    height: 66,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayOn: { backgroundColor: Colors.brown, borderColor: Colors.brown },
  dayEmpty: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: Colors.lineStrong },
  dayLetter: { fontFamily: Fonts.sansSemiBold, fontSize: 11, color: Colors.textMuted },
  dayNum: { fontFamily: Fonts.sansBold, fontSize: 18, color: Colors.text },
  dayDot: { width: 5, height: 5, borderRadius: 3 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  refChip: { borderWidth: 1, borderColor: Colors.lineStrong, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  refText: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: Colors.textMuted },
  series: { flex: 1, height: 92, borderRadius: Radius.md, padding: 12, justifyContent: 'space-between' },
  seriesName: { fontFamily: Fonts.display, fontSize: 19, lineHeight: 20 },
  earlier: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, borderBottomWidth: 1, borderBottomColor: Colors.line },
  earlierDate: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: Colors.eyebrow },
  earlierTitle: { fontFamily: Fonts.display, fontSize: 21, lineHeight: 23, color: Colors.text },
});
