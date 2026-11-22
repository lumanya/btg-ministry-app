import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { dayName, monthName, t } from '@/i18n';
import { Eagle, ScrollCard, useTones } from '@/components/art';
import { Icon } from '@/components/icon';
import { StatLine } from '@/components/like-button';
import { Pop } from '@/components/motion';
import { Body, Button, Eyebrow, IconButton, Screen, Tap, Title, SectionHeader } from '@/components/ui';
import { Fonts, Palette, Radius } from '@/constants/theme';
import { Devotional, formatDate } from '@/content/sample';
import { devotionalEpisode } from '@/lib/content';
import { useContent } from '@/state/content';
import { useStats } from '@/state/engagement';
import { usePlayer } from '@/state/player';
import { useLibrary } from '@/state/library';
import { useColors, useStyles } from '@/state/theme';


/** The seven days ending on the newest devotional, so the strip always has content. */
function buildWeek(devotionals: Devotional[]) {
  const newest = new Date(`${devotionals[0].date}T12:00:00`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(newest);
    d.setDate(newest.getDate() - (6 - i));
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { iso, day: d.getDate(), weekday: d.getDay(), devotional: devotionals.find((x) => x.date === iso) };
  });
}


export default function DevotionalTab() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const toneSet = useTones();
  const router = useRouter();
  const lib = useLibrary();
  const content = useContent();
  const player = usePlayer();
  const devotionals = content.devotionals;
  const week = buildWeek(devotionals);
  const [picked, setSelectedId] = useState<string | null>(null);
  const selected = devotionals.find((d) => d.id === picked) ?? content.today;
  const selectedId = selected.id;
  const [y, m] = week[6].iso.split('-').map(Number);
  const weekIds = new Set(week.map((w) => w.devotional?.id));
  const earlier = devotionals.filter((d) => !weekIds.has(d.id));
  const statOf = useStats('devotional', [selected.id, ...earlier.slice(0, 40).map((d) => d.id)]);
  const selectedStat = statOf(selected.id);

  const open = (id: string) => router.push({ pathname: '/devotional/[id]', params: { id } });

  return (
    <Screen gap={22} refreshing={content.refreshing} onRefresh={content.status === 'sample' ? undefined : content.refresh}>
      <View style={styles.header}>
        <Title size={34}>{t('Daily devotional')}</Title>
        <Pop trigger={lib.streak} style={styles.streak}>
          <View accessible accessibilityLabel={t('{n}-day reading streak', { n: lib.streak })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="flame" size={16} color={c.accent} filled={lib.streak > 0} />
            <Text style={styles.streakText}>{lib.streak}</Text>
          </View>
        </Pop>
      </View>

      <View style={{ gap: 10 }}>
        <SectionHeader small title={`${monthName(m - 1)} ${y}`} />
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
                accessibilityLabel={`${dayName(w.weekday)} ${w.day}: ${d ? `${d.title}${lib.isRead(d.id) ? ', read' : ''}` : '—'}`}
                onPress={() => d && setSelectedId(d.id)}
                style={[styles.day, on && styles.dayOn, !d && styles.dayEmpty]}>
                <Text style={[styles.dayLetter, on && { color: c.cream }]}>{dayName(w.weekday, true).charAt(0)}</Text>
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
                <Text style={[styles.refText, { color: c.cream }]}>{t('Read')}</Text>
              </View>
            ) : selected.scripture ? (
              <View style={styles.refChip}>
                <Text style={styles.refText}>{selected.scripture.ref}</Text>
              </View>
            ) : null}
          </View>
          <Title size={30}>{selected.title}</Title>
          <Body>{selected.excerpt}</Body>
          <StatLine likes={selectedStat?.likes ?? 0} views={selectedStat?.views ?? 0} viewWord="reads" />
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
            <Button label={lib.isRead(selected.id) ? t('Read again') : t('Read')} variant={lib.isRead(selected.id) ? 'outline' : 'primary'} onPress={() => open(selected.id)} style={{ flex: 1, minHeight: 46 }} />
            {selected.audioUrl ? (
              <IconButton
                icon="podcast"
                label={t('Listen to this devotional')}
                size={46}
                onPress={() => {
                  player.play(devotionalEpisode(selected));
                  router.push('/player');
                }}
                style={{ borderColor: c.accent, backgroundColor: 'transparent' }}
              />
            ) : null}
          </View>
        </ScrollCard>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHeader small title={t('Series')} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {content.series.map((s) => {
            const tn = toneSet[s.tone];
            const first = devotionals.find((d) => d.series === s.name);
            return (
              <Tap
                key={s.name}
                accessibilityRole="button"
                accessibilityLabel={t('{title} series, {n} teachings', { title: s.name, n: devotionals.filter((d) => d.series === s.name).length })}
                onPress={() => first && setSelectedId(first.id)}
                style={[styles.series, { backgroundColor: tn.bg }]}>
                <Eagle height={30} light={tn.lightEagle} />
                <Text style={[styles.seriesName, { color: tn.text }]}>{s.name}</Text>
              </Tap>
            );
          })}
        </View>
      </View>

      <View>
        <SectionHeader small title={t('Earlier')} />
        {earlier.map((d) => (
          <Tap key={d.id} accessibilityRole="button" accessibilityLabel={`${d.title}, ${formatDate(d.date)}`} onPress={() => open(d.id)} style={styles.earlier}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.earlierDate}>{formatDate(d.date)}</Text>
              <Text style={styles.earlierTitle}>{d.title}</Text>
              <StatLine likes={statOf(d.id)?.likes ?? 0} views={statOf(d.id)?.views ?? 0} viewWord="reads" />
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
