import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { Arch } from '@/components/art';
import { Icon } from '@/components/icon';
import { IconButton, Tap } from '@/components/ui';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { podcast } from '@/content/sample';
import { formatSpeed, usePlayer } from '@/state/player';

/** Circular "skip" icon with the number of seconds inside. */
function Skip({ seconds, forward }: { seconds: number; forward?: boolean }) {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24">
      <Path
        d={forward ? 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3' : 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3'}
        stroke={Colors.brownDark}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <Path d={forward ? 'M19.5 4v3.5H16' : 'M4.5 4v3.5H8'} stroke={Colors.brownDark} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <SvgText x={12} y={15.2} textAnchor="middle" fontSize={7} fontWeight="700" fill={Colors.brownDark}>
        {String(seconds)}
      </SvgText>
    </Svg>
  );
}

export default function Player() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const [saved, setSaved] = useState(false);
  const [sleep, setSleep] = useState(false);

  const index = podcast.episodes.findIndex((e) => e.id === player.episode.id);
  const go = (step: number) => {
    const next = podcast.episodes[(index + step + podcast.episodes.length) % podcast.episodes.length];
    player.play(next);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.topBar}>
        <IconButton icon="down" label="Close player" variant="plain" iconSize={24} onPress={() => (router.canGoBack() ? router.back() : router.replace('/podcast'))} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={styles.kicker}>Now playing</Text>
          <Text style={styles.show}>{podcast.name}</Text>
        </View>
        <IconButton icon="queue" label="Up next queue" variant="plain" onPress={() => router.navigate('/podcast')} />
      </View>

      <View style={styles.art}>
        <Arch tone="brown" width={274} height={296} eagleHeight={162} label={player.episode.series} />
      </View>

      <View style={styles.titleRow}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.title} accessibilityRole="header">{player.episode.title}</Text>
          <Text style={styles.speaker}>Iman Mwakanyamale</Text>
        </View>
        <IconButton
          icon="heart"
          variant="plain"
          iconSize={24}
          filled={saved}
          selected={saved}
          label={saved ? 'Remove from saved' : 'Save this episode'}
          onPress={() => setSaved((s) => !s)}
        />
      </View>

      {/* Position is a placeholder until audio playback is connected. */}
      <View style={{ gap: 8 }}>
        <View style={styles.track} accessible accessibilityRole="adjustable" accessibilityLabel="Position" accessibilityValue={{ min: 0, max: 100, now: 41 }}>
          <View style={[styles.trackFill, { width: '41%' }]} />
          <View style={[styles.thumb, { left: '41%' }]} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.time}>12:40</Text>
          <Text style={styles.time}>−18:05</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Tap accessibilityRole="button" accessibilityLabel="Previous episode" onPress={() => go(-1)} style={styles.ctrl}>
          <Icon name="prev" size={24} />
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel="Back 15 seconds" style={styles.ctrl}>
          <Skip seconds={15} />
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel={player.playing ? 'Pause' : 'Play'} onPress={player.toggle} style={styles.playBtn}>
          <Icon name={player.playing ? 'pause' : 'play'} size={30} color={Colors.cream} />
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel="Forward 30 seconds" style={styles.ctrl}>
          <Skip seconds={30} forward />
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel="Next episode" onPress={() => go(1)} style={styles.ctrl}>
          <Icon name="next" size={24} />
        </Tap>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Tap accessibilityRole="button" accessibilityLabel={`Playback speed ${formatSpeed(player.speed)}. Tap to change`} onPress={player.cycleSpeed} style={styles.pill}>
          <Text style={[styles.pillText, { fontFamily: Fonts.sansBold }]}>{formatSpeed(player.speed)}</Text>
        </Tap>
        <Tap
          accessibilityRole="button"
          accessibilityState={{ selected: sleep }}
          accessibilityLabel={sleep ? 'Sleep timer on, 30 minutes' : 'Sleep timer'}
          onPress={() => setSleep((s) => !s)}
          style={[styles.pill, sleep && { backgroundColor: Colors.brown, borderColor: Colors.brown }]}>
          <Icon name="moon" size={16} color={sleep ? Colors.cream : Colors.brownDark} />
          <Text style={[styles.pillText, sleep && { color: Colors.cream }]}>{sleep ? '30 min' : 'Sleep'}</Text>
        </Tap>
        <Tap accessibilityRole="button" onPress={() => Share.share({ message: `${player.episode.title} — ${podcast.name}` })} style={styles.pill}>
          <Icon name="share" size={16} />
          <Text style={styles.pillText}>Share</Text>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.parchment, paddingHorizontal: 24, justifyContent: 'space-between', gap: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: Colors.eyebrow },
  show: { fontFamily: Fonts.sansSemiBold, fontSize: 13, color: Colors.text },
  art: {
    alignSelf: 'center',
    width: 318,
    height: 318,
    borderRadius: 30,
    backgroundColor: Colors.brown,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    shadowColor: Colors.brownDark,
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  title: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 33, color: Colors.text },
  speaker: { fontFamily: Fonts.sans, fontSize: 15, color: Colors.textMuted },
  track: { height: 20, justifyContent: 'center' },
  trackFill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: Colors.brown },
  thumb: { position: 'absolute', width: 16, height: 16, marginLeft: -8, borderRadius: 8, backgroundColor: Colors.brown, borderWidth: 2, borderColor: Colors.parchment },
  time: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: Colors.textMuted, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  ctrl: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.brown,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.brownDark,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  pill: {
    flex: 1,
    height: 48,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.lineStrong,
    backgroundColor: Colors.ivory,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillText: { fontFamily: Fonts.sansSemiBold, fontSize: 13, color: Colors.brownDark },
});
