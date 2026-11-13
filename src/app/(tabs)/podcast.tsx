import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Arch, Eagle, tones } from '@/components/art';
import { Icon } from '@/components/icon';
import { Body, Eyebrow, IconButton, Screen, Tap, Title } from '@/components/ui';
import { Colors, Fonts, Radius, ScreenPadding } from '@/constants/theme';
import { podcast } from '@/content/sample';
import { usePlayer } from '@/state/player';

export default function Podcast() {
  const router = useRouter();
  const player = usePlayer();
  const [following, setFollowing] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      <Screen gap={24}>
        <Title>Podcast</Title>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={[styles.cover, { backgroundColor: Colors.brown }]}>
            <Arch tone="brown" width={108} height={120} eagleHeight={92} />
          </View>
          <View style={{ flex: 1, justifyContent: 'space-between', gap: 10 }}>
            <View style={{ gap: 6 }}>
              <Title size={26}>{podcast.name}</Title>
              <Body style={{ fontSize: 13, lineHeight: 18 }}>{podcast.description}</Body>
            </View>
            <Tap
              accessibilityRole="button"
              accessibilityState={{ selected: following }}
              onPress={() => setFollowing((f) => !f)}
              style={[styles.follow, following && { backgroundColor: Colors.brown }]}>
              <Icon name={following ? 'check' : 'plus'} size={16} color={following ? Colors.cream : Colors.brownDark} />
              <Text style={[styles.followText, following && { color: Colors.cream }]}>{following ? 'Following' : 'Follow'}</Text>
            </Tap>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Eyebrow>Series</Eyebrow>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -ScreenPadding }}
            contentContainerStyle={{ paddingHorizontal: ScreenPadding, gap: 12 }}>
            {podcast.series.map((s) => {
              const t = tones[s.tone];
              const first = podcast.episodes.find((e) => e.series === s.name)!;
              return (
                <Tap
                  key={s.name}
                  accessibilityRole="button"
                  accessibilityLabel={`Play the ${s.name} series`}
                  onPress={() => {
                    player.play(first);
                    router.push('/player');
                  }}
                  style={[styles.seriesCard, { backgroundColor: t.bg }]}>
                  <Eagle height={60} light={s.tone !== 'sand'} />
                  <Text style={[styles.seriesName, { color: t.text }]}>{s.name}</Text>
                </Tap>
              );
            })}
          </ScrollView>
        </View>

        <View>
          <Eyebrow style={{ marginBottom: 8 }}>Episodes</Eyebrow>
          {podcast.episodes.map((e) => {
            const active = player.episode.id === e.id && player.playing;
            return (
              <View key={e.id} style={styles.episode}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.episodeSeries}>{e.series}</Text>
                  <Text style={styles.episodeTitle}>{e.title}</Text>
                </View>
                <IconButton
                  icon={active ? 'pause' : 'play'}
                  label={`${active ? 'Pause' : 'Play'} ${e.title}`}
                  variant={active ? 'solid' : 'outline'}
                  iconSize={18}
                  onPress={() => player.play(e)}
                  style={!active ? { borderColor: Colors.brown, backgroundColor: 'transparent' } : undefined}
                />
              </View>
            );
          })}
        </View>
      </Screen>

      <View style={styles.miniWrap}>
        <View style={styles.mini}>
          <Tap
            accessibilityRole="button"
            accessibilityLabel={`Open player: ${player.episode.title}`}
            onPress={() => router.push('/player')}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
            <View style={styles.miniArt}>
              <Eagle height={38} light />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.miniTitle} numberOfLines={1}>{player.episode.title}</Text>
              <Text style={styles.miniMeta}>{player.playing ? 'Playing' : 'Paused'} · {podcast.name}</Text>
            </View>
          </Tap>
          <IconButton icon={player.playing ? 'pause' : 'play'} label={player.playing ? 'Pause' : 'Play'} variant="cream" iconSize={18} onPress={player.toggle} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderColor: Colors.brown,
  },
  followText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Colors.brownDark },
  seriesCard: { width: 150, height: 168, borderRadius: Radius.lg, padding: 14, justifyContent: 'space-between' },
  seriesName: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 25 },
  episode: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.line },
  episodeSeries: { fontFamily: Fonts.sansSemiBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: Colors.eyebrow },
  episodeTitle: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 24, color: Colors.text },
  miniWrap: { paddingHorizontal: 10, paddingBottom: 8, backgroundColor: Colors.ivory },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6, paddingLeft: 8, borderRadius: 18, backgroundColor: Colors.deep },
  miniArt: { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.brown, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 },
  miniTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Colors.cream },
  miniMeta: { fontFamily: Fonts.sans, fontSize: 12, color: Colors.creamMuted },
});
