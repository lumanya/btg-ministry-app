import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Tap } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { t, weekLetters } from '@/i18n';
import { growth, MILESTONES } from '@/lib/streak';
import { useClips } from '@/state/clips';
import { useLibrary } from '@/state/library';
import { useRhythm } from '@/state/rhythm';

const INK = '#17120E';
const GOLD = '#D4AF73';
const WHITE = '#FFFFFF';
const SOFT = 'rgba(255,255,255,0.72)';
const RULE = 'rgba(255,255,255,0.12)';

/** Shown after a reading (and from Today's streak line): the streak, this week, and the next milestone. */
export default function Rhythm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lib = useLibrary();
  const rhythm = useRhythm();
  const hasSeeds = useClips().clips.length > 0;
  const g = growth(lib.streak);
  const letters = weekLetters();

  const complete = lib.readToday && rhythm.prayedToday && (rhythm.seedToday || !hasSeeds);
  const line = complete ? t('Amen. Today’s rhythm is complete.') : lib.readToday ? t('Amen. You’ve read today’s word.') : t('One small step at a time.');
  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  // Which milestone the bar is heading to, and how far along the way.
  const target = g.next ?? MILESTONES[MILESTONES.length - 1];
  const nextIndex = MILESTONES.findIndex((m) => m.days === target.days);
  const from = nextIndex > 0 ? MILESTONES[nextIndex - 1].days : 0;
  const within = g.next ? (lib.streak - from) / (target.days - from) : 1;
  const fill = Math.min(1, (Math.max(0, nextIndex - 1) + (nextIndex === 0 ? 0 : within)) / (MILESTONES.length - 1));

  const weekCode = lib.week.map((d) => (d.read ? 'r' : d.grace ? 'g' : d.isFuture ? 'f' : '-')).join('');

  return (
    <View style={{ flex: 1, backgroundColor: INK }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: 22 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'flex-end' }}>
          <Tap accessibilityRole="button" accessibilityLabel={t('Close')} onPress={close} style={styles.close}>
            <Icon name="close" size={20} color={WHITE} />
          </Tap>
        </View>

        <View style={styles.hero} accessible accessibilityLabel={`${t('{n} days in the Word', { n: lib.streak })}. ${line}`}>
          <Animated.Text entering={ZoomIn.springify().damping(12)} style={styles.number}>
            {lib.streak}
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(150)} style={styles.days}>
            {lib.streak === 1 ? t('day in the Word') : t('days in the Word')}
          </Animated.Text>
          <Animated.Text entering={FadeIn.delay(250)} style={styles.line}>
            {line}
          </Animated.Text>
        </View>

        <Animated.View entering={FadeInDown.delay(300)} style={{ gap: 12, marginTop: 34 }}>
          <View style={styles.week} accessibilityRole="summary" accessibilityLabel={t('This week')}>
            {lib.week.map((d, i) => (
              <View key={d.key} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View
                  style={[
                    styles.dot,
                    d.read ? styles.dotRead : d.grace ? styles.dotGrace : styles.dotEmpty,
                    d.isToday && styles.dotToday,
                  ]}
                  accessibilityLabel={d.read ? t('Read') : d.grace ? t('Grace day') : d.isFuture ? '' : t('Not read')}>
                  {d.read ? <Icon name="check" size={16} color={INK} /> : d.grace ? <Icon name="moon" size={16} color={GOLD} /> : null}
                </View>
                <Text style={[styles.dayLetter, d.isToday && { color: WHITE, fontFamily: Fonts.sansBold }, d.grace && { color: GOLD }]}>{d.grace ? t('Grace') : letters[i]}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.note}>{t('Missed a day? One grace day each week keeps your streak alive.')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.growth}>
          <View style={styles.growthHead}>
            <Text style={styles.growthTitle}>{g.next ? t(g.next.name) : t('Fruitful')}</Text>
            <Text style={styles.growthMeta}>{g.next ? (g.remaining === 1 ? t('1 more day') : t('{n} more days', { n: g.remaining })) : t('Every milestone reached')}</Text>
          </View>
          <View style={styles.track} accessible={false}>
            <View style={styles.rail} />
            <View style={[styles.railFill, { width: `${fill * 100}%` }]} />
            <View style={styles.nodes}>
              {MILESTONES.map((m, i) => {
                const reached = lib.streak >= m.days;
                const isNext = g.next?.days === m.days;
                return (
                  <View key={m.days} style={{ alignItems: i === 0 ? 'flex-start' : i === MILESTONES.length - 1 ? 'flex-end' : 'center', gap: 8 }}>
                    <View style={[styles.node, reached ? styles.nodeReached : isNext ? styles.nodeNext : styles.nodeLater]} />
                    <Text style={[styles.nodeText, reached ? { color: GOLD } : isNext ? { color: WHITE } : null]}>
                      {t(m.name)} · {m.days}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        <View style={{ flex: 1, minHeight: 32 }} />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Tap
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/share', params: { kind: 'week', text: String(lib.streak), title: weekCode, format: 'status', theme: 'ink' } })}
            style={styles.shareButton}>
            <Icon name="share" size={18} color={WHITE} />
            <Text style={styles.shareText}>{t('Share my week')}</Text>
          </Tap>
          <Tap accessibilityRole="button" onPress={close} style={styles.doneButton}>
            <Text style={styles.doneText}>{t('Done')}</Text>
          </Tap>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 6, marginTop: 4 },
  number: { fontFamily: Fonts.display, fontSize: 168, lineHeight: 160, color: GOLD, fontVariant: ['lining-nums'] },
  days: { fontFamily: Fonts.displayItalic, fontSize: 30, color: WHITE },
  line: { fontFamily: Fonts.sans, fontSize: 15, color: SOFT, textAlign: 'center' },
  week: { flexDirection: 'row', gap: 4 },
  dot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dotRead: { backgroundColor: GOLD },
  dotGrace: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: GOLD },
  dotEmpty: { backgroundColor: 'rgba(255,255,255,0.08)' },
  dotToday: { boxShadow: `0 0 0 3px ${INK}, 0 0 0 4.5px ${GOLD}` },
  dayLetter: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: SOFT },
  note: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, color: SOFT, textAlign: 'center' },
  growth: { marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: RULE, gap: 16 },
  growthHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  growthTitle: { fontFamily: Fonts.displayMedium, fontSize: 26, color: WHITE },
  growthMeta: { fontFamily: Fonts.sans, fontSize: 13, color: SOFT },
  track: { height: 40 },
  rail: { position: 'absolute', left: 7, right: 7, top: 6, height: 2, backgroundColor: 'rgba(255,255,255,0.16)' },
  railFill: { position: 'absolute', left: 7, top: 6, height: 2, backgroundColor: GOLD, maxWidth: '96%' },
  nodes: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', justifyContent: 'space-between' },
  node: { width: 14, height: 14, borderRadius: 7 },
  nodeReached: { backgroundColor: GOLD },
  nodeNext: { borderWidth: 2, borderColor: GOLD, backgroundColor: INK },
  nodeLater: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: INK },
  nodeText: { fontFamily: Fonts.sansSemiBold, fontSize: 11, color: SOFT },
  shareButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  shareText: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: WHITE },
  doneButton: { flex: 1, minHeight: 54, borderRadius: 16, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontFamily: Fonts.sansBold, fontSize: 15, color: INK },
});
