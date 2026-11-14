import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Eagle, ScrollCard, useTones } from '@/components/art';
import { Icon } from '@/components/icon';
import { Pop } from '@/components/motion';
import { Body, Button, Eyebrow, IconButton, Screen, Tap, Title } from '@/components/ui';
import { Fonts, Palette, Radius } from '@/constants/theme';
import { devotionals, formatDate, podcast, todaysDevotionalId } from '@/content/sample';
import { useLibrary } from '@/state/library';
import { useColors, useStyles } from '@/state/theme';

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
  const c = useColors();
  const styles = useStyles(createStyles);
  const toneSet = useTones();
  const router = useRouter();
  const lib = useLibrary();
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
        <Pop trigger={lib.streak} style={styles.streak}>
          <View accessible accessibilityLabel={`${lib.streak}-day reading streak`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="flame" size={16} color={c.accent} filled={lib.streak > 0} />
            <Text style={styles.streakText}>{lib.streak}</Text>
          </View>
        </Pop>
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
                accessibilityLabel={`${w.weekday} ${w.day}: ${d ? `${d.title}${lib.isRead(d.id) ? ', read' : ''}` : 'no devotional'}`}
                onPress={() => d && setSelectedId(d.id)}
                style={[styles.day, on && styles.dayOn, !d && styles.dayEmpty]}>
                <Text style={[styles.dayLetter, on && { color: c.cream }]}>{w.weekday.charAt(0)}</Text>
                <Text style={[styles.dayNum, on && { color: c.cream }, !d && { color: c.textSubtle }]}>{w.day}</Text>
                {d && lib.isRead(d.id) ? (
                  <Icon name="check" size={12} color={on ? c.gold : c.accent} />
                ) : (
                  <View style={[styles.dayDot, d && { backgroundColor: on ? c.gold : c.accent }]} />
                )}
              </Tap>
            );
          })}
        </View>
      </View>

      <View accessibilityLiveRegion="polite">
        <ScrollCard>
          <View style={styles.rowBetween}>
            <Eyebrow style={{ fontSize: 12 }}>{formatDate(selected.date)}</Eyebrow>
            {lib.isRead(selected.id) ? (
              <View style={[styles.refChip, styles.readChip]}>
                <Icon name="check" size={13} color={c.cream} />
                <Text style={[styles.refText, { color: c.cream }]}>Read</Text>
              </View>
            ) : selected.scripture ? (
              <View style={styles.refChip}>
                <Text style={styles.refText}>{selected.scripture.ref}</Text>
              </View>
            ) : null}
          </View>
          <Title size={30}>{selected.title}</Title>
          <Body>{selected.excerpt}</Body>
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
            <Button label={lib.isRead(selected.id) ? 'Read again' : 'Read'} variant={lib.isRead(selected.id) ? 'outline' : 'primary'} onPress={() => open(selected.id)} style={{ flex: 1, minHeight: 46 }} />
            <IconButton
              icon="podcast"
              label="Listen to this devotional"
              size={46}
              onPress={() => router.push('/player')}
              style={{ borderColor: c.accent, backgroundColor: 'transparent' }}
            />
          </View>
        </ScrollCard>
      </View>

      <View style={{ gap: 12 }}>
        <Eyebrow>Series</Eyebrow>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {podcast.series.map((s) => {
            const t = toneSet[s.tone];
            const first = devotionals.find((d) => d.series === s.name);
            return (
              <Tap
                key={s.name}
                accessibilityRole="button"
                accessibilityLabel={`${s.name} series`}
                onPress={() => first && setSelectedId(first.id)}
                style={[styles.series, { backgroundColor: t.bg }]}>
                <Eagle height={30} light={t.lightEagle} />
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
            {lib.isRead(d.id) ? <Icon name="check" size={16} color={c.accent} /> : null}
            <Icon name="chevron" size={18} color={c.accent} />
          </Tap>
        ))}
      </View>
    </Screen>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    backgroundColor: c.parchment,
    borderWidth: 1,
    borderColor: c.line,
  },
  streakText: { fontFamily: Fonts.sansBold, fontSize: 14, color: c.accent },
  week: { flexDirection: 'row', gap: 4 },
  day: {
    flex: 1,
    height: 66,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayOn: { backgroundColor: c.brown, borderColor: c.brown },
  dayEmpty: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: c.lineStrong },
  dayLetter: { fontFamily: Fonts.sansSemiBold, fontSize: 11, color: c.textMuted },
  dayNum: { fontFamily: Fonts.sansBold, fontSize: 18, color: c.text },
  dayDot: { width: 5, height: 5, borderRadius: 3 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  readChip: { backgroundColor: c.brown, borderColor: c.brown },
  refChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: c.lineStrong, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  refText: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: c.textMuted },
  series: { flex: 1, height: 92, borderRadius: Radius.md, padding: 12, justifyContent: 'space-between' },
  seriesName: { fontFamily: Fonts.display, fontSize: 19, lineHeight: 20 },
  earlier: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, borderBottomWidth: 1, borderBottomColor: c.line },
  earlierDate: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: c.eyebrow },
  earlierTitle: { fontFamily: Fonts.display, fontSize: 21, lineHeight: 23, color: c.text },
});
