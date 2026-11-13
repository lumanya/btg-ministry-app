import { useRouter } from 'expo-router';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Eagle, ScrollCard, SermonArt } from '@/components/art';
import { Icon } from '@/components/icon';
import { Body, Button, Card, Eyebrow, IconButton, LiveBadge, ProgressBar, Screen, SectionHeader, Tap, Title } from '@/components/ui';
import { Colors, Fonts, Radius, ScreenPadding } from '@/constants/theme';
import { findDevotional, formatDate, quotes, sermons, todaysDevotionalId } from '@/content/sample';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Home() {
  const router = useRouter();
  const today = findDevotional(todaysDevotionalId)!;
  const quote = quotes[new Date().getDate() % quotes.length];

  // Sample streak until reading history is stored in the backend.
  const todayIndex = (new Date().getDay() + 6) % 7;
  const streak = Math.min(3, todayIndex);

  return (
    <Screen gap={28}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Eagle height={40} />
          <Text style={styles.brandText}>BTG Ministry</Text>
        </View>
        <IconButton icon="bell" label="Notifications" />
      </View>

      <View style={{ gap: 4 }}>
        <Text style={styles.greeting}>{greeting()}</Text>
        <Title size={38}>Grace and peace to you.</Title>
      </View>

      <Tap accessibilityRole="button" accessibilityLabel="Join the Sunday Service livestream" onPress={() => router.navigate('/live')} style={styles.liveCard}>
        <View style={styles.liveVideo}>
          <View style={styles.liveWatermark}>
            <Eagle height={190} light />
          </View>
          <View style={{ position: 'absolute', top: 12, left: 12 }}>
            <LiveBadge />
          </View>
          <View style={styles.playDisc}>
            <Icon name="play" size={24} color={Colors.brown} />
          </View>
        </View>
        <View style={styles.liveFooter}>
          <View style={{ gap: 4, flex: 1 }}>
            <Text style={styles.liveTitle}>Sunday Service</Text>
            <Text style={styles.liveMeta}>Iman Mwakanyamale · Streaming now</Text>
          </View>
          <View style={styles.joinPill}>
            <Text style={styles.joinText}>Join</Text>
          </View>
        </View>
      </Tap>

      <View style={{ gap: 4 }}>
        <SectionHeader title="Today's devotional" action="See all" onAction={() => router.navigate('/devotional')} />
        <ScrollCard>
          <View style={styles.rowBetween}>
            <Eyebrow style={{ fontSize: 12 }}>{formatDate(today.date)}</Eyebrow>
            {today.scripture ? (
              <View style={styles.refChip}>
                <Text style={styles.refText}>{today.scripture.ref}</Text>
              </View>
            ) : null}
          </View>
          <Title size={32}>{today.title}</Title>
          <Body>{today.excerpt}</Body>
          <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
            <Button
              label="Read now"
              onPress={() => router.push({ pathname: '/devotional/[id]', params: { id: today.id } })}
              style={{ flex: 1, minHeight: 46 }}
            />
            <IconButton icon="podcast" label="Listen to this devotional" size={46} onPress={() => router.push('/player')} style={{ borderColor: Colors.brown, backgroundColor: 'transparent' }} />
          </View>
        </ScrollCard>
      </View>

      <Card style={{ gap: 14, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={styles.flameDisc}>
            <Icon name="flame" color={Colors.brown} />
          </View>
          <View style={{ gap: 2, flex: 1 }}>
            <Text style={styles.cardTitle}>{streak > 0 ? `${streak}-day reading streak` : 'Start a reading streak'}</Text>
            <Body style={{ fontSize: 14, lineHeight: 20 }}>{streak > 0 ? 'Read today to keep it going.' : 'Read today’s devotional to begin.'}</Body>
          </View>
        </View>
        <View style={styles.week} accessible accessibilityLabel={`You have read ${streak} days in a row this week`}>
          {WEEK.map((d, i) => {
            const done = i < todayIndex && i >= todayIndex - streak;
            const isToday = i === todayIndex;
            return (
              <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                <View style={[styles.dot, done && styles.dotDone, isToday && styles.dotToday]} />
                <Text style={[styles.dayLetter, isToday && { color: Colors.text, fontFamily: Fonts.sansBold }]}>{d}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      <View style={{ gap: 8 }}>
        <SectionHeader title="Continue listening" />
        <Tap accessibilityRole="button" accessibilityLabel="Continue The Soul: Consciousness" onPress={() => router.push('/player')} style={[styles.listenRow]}>
          <View style={styles.listenArt}>
            <Eagle height={54} light />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.listenTitle}>The Soul: Consciousness</Text>
            <Text style={styles.metaText}>Audio teaching · 18 min left</Text>
            <ProgressBar value={0.58} />
          </View>
          <View style={styles.playSmall}>
            <Icon name="play" size={18} color={Colors.cream} />
          </View>
        </Tap>
      </View>

      <View style={{ gap: 8 }}>
        <SectionHeader title="Latest sermons" action="See all" onAction={() => router.navigate('/sermons')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -ScreenPadding }}
          contentContainerStyle={{ paddingHorizontal: ScreenPadding, gap: 14 }}>
          {sermons.slice(0, 4).map((s) => (
            <Tap
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`${s.title}, ${s.meta}`}
              onPress={() => router.push({ pathname: '/sermon/[id]', params: { id: s.id } })}
              style={{ width: 236, gap: 10 }}>
              <SermonArt title={s.shortTitle} tone={s.tone} />
              <View style={{ gap: 2 }}>
                <Text style={styles.sermonTitle} numberOfLines={2}>{s.title}</Text>
                <Text style={styles.metaText}>{s.meta}</Text>
              </View>
            </Tap>
          ))}
        </ScrollView>
      </View>

      <View style={styles.quote}>
        <Eyebrow style={{ fontSize: 12 }}>Word for today</Eyebrow>
        <Text style={styles.quoteText}>“{quote}”</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Iman Mwakanyamale</Text>
          <IconButton
            icon="share"
            label="Share this word"
            iconSize={18}
            onPress={() => Share.share({ message: `“${quote}” — Iman Mwakanyamale, BTG Ministry` })}
            style={{ backgroundColor: 'transparent', borderColor: Colors.brown }}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandText: { fontFamily: Fonts.display, fontSize: 22, color: Colors.text },
  greeting: { fontFamily: Fonts.sansMedium, fontSize: 14, color: Colors.textMuted },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },

  liveCard: { backgroundColor: Colors.brown, borderRadius: Radius.xl, padding: 14, paddingBottom: 18, gap: 14 },
  liveVideo: { height: 176, borderRadius: Radius.md, backgroundColor: Colors.night, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  liveWatermark: { position: 'absolute', right: -10, bottom: -18, opacity: 0.18 },
  playDisc: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  liveFooter: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 4 },
  liveTitle: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 30, color: Colors.cream },
  liveMeta: { fontFamily: Fonts.sans, fontSize: 14, color: Colors.creamMuted },
  joinPill: { height: 40, paddingHorizontal: 18, borderRadius: Radius.pill, backgroundColor: Colors.cream, justifyContent: 'center' },
  joinText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Colors.brownDark },

  refChip: { borderWidth: 1, borderColor: Colors.lineStrong, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  refText: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: Colors.textMuted },

  flameDisc: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.parchment, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 16, color: Colors.text },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.sand },
  dotDone: { backgroundColor: Colors.brown },
  dotToday: { backgroundColor: 'transparent', borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.brown },
  dayLetter: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: Colors.textMuted },

  listenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  listenArt: { width: 64, height: 64, borderRadius: 14, backgroundColor: Colors.brown, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  listenTitle: { fontFamily: Fonts.display, fontSize: 21, lineHeight: 22, color: Colors.text },
  metaText: { fontFamily: Fonts.sans, fontSize: 13, color: Colors.textMuted },
  playSmall: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.brown, alignItems: 'center', justifyContent: 'center' },
  sermonTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, lineHeight: 20, color: Colors.text },

  quote: { gap: 14, padding: 20, paddingTop: 24, borderRadius: Radius.lg, backgroundColor: Colors.sand },
  quoteText: { fontFamily: Fonts.displayItalic, fontSize: 24, lineHeight: 29, color: Colors.brownDark },
});
