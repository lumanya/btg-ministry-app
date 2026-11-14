import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { Arch } from '@/components/art';
import { Icon } from '@/components/icon';
import { Scrubber } from '@/components/scrubber';
import { IconButton, Tap } from '@/components/ui';
import { Fonts, Palette, Radius } from '@/constants/theme';
import { formatClock } from '@/lib/podcast';
import { formatSpeed, usePlayer } from '@/state/player';
import { useColors, useStyles } from '@/state/theme';

/** Circular "skip" icon with the number of seconds inside. */
function Skip({ seconds, forward }: { seconds: number; forward?: boolean }) {
  const c = useColors();
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24">
      <Path
        d={forward ? 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3' : 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3'}
        stroke={c.brownDark}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <Path d={forward ? 'M19.5 4v3.5H16' : 'M4.5 4v3.5H8'} stroke={c.brownDark} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <SvgText x={12} y={15.2} textAnchor="middle" fontSize={7} fontWeight="700" fill={c.brownDark}>
        {String(seconds)}
      </SvgText>
    </Svg>
  );
}

export default function PlayerScreen() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = usePlayer();

  // Nothing chosen yet: show the episode the listener would resume.
  const episode = p.episode ?? p.resume?.episode ?? p.podcast.episodes[0] ?? null;
  const isLoaded = !!p.episode;
  const position = isLoaded ? p.position : p.resume?.position ?? 0;
  const duration = isLoaded ? p.duration : p.resume?.duration ?? episode?.duration ?? 0;
  const disabled = !episode?.audioUrl;
  const artwork = episode?.artwork ?? p.podcast.artwork;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/podcast'));

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.topBar}>
        <IconButton icon="down" label="Close player" variant="plain" iconSize={24} onPress={close} />
        <View style={{ alignItems: 'center', gap: 2, flex: 1 }}>
          <Text style={styles.kicker}>Now playing</Text>
          <Text style={styles.show} numberOfLines={1}>{p.podcast.title}</Text>
        </View>
        <IconButton icon="queue" label="All episodes" variant="plain" onPress={() => router.navigate('/podcast')} />
      </View>

      <View style={styles.art}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
        ) : (
          <Arch tone="brown" width={274} height={296} eagleHeight={162} label={episode?.series ?? undefined} />
        )}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={3}>
          {episode?.title ?? 'No episodes yet'}
        </Text>
        <Text style={styles.speaker}>Iman Mwakanyamale</Text>
        {disabled && episode ? <Text style={styles.notice}>This is a sample episode. Audio arrives when the podcast feed is connected.</Text> : null}
      </View>

      <View style={{ gap: 4 }}>
        <Scrubber position={position} duration={duration} onSeek={p.seekTo} disabled={disabled || !isLoaded} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.time}>{formatClock(position)}</Text>
          <Text style={styles.time}>{duration > 0 ? `−${formatClock(Math.max(0, duration - position))}` : '--:--'}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Tap accessibilityRole="button" accessibilityLabel="Previous episode" onPress={() => p.next(-1)} style={styles.ctrl}>
          <Icon name="prev" size={24} />
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel="Back 15 seconds" disabled={disabled || !isLoaded} onPress={() => p.skip(-15)} style={styles.ctrl}>
          <Skip seconds={15} />
        </Tap>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={p.playing ? 'Pause' : 'Play'}
          disabled={disabled}
          onPress={() => (p.episode || !episode ? p.toggle() : p.play(episode))}
          style={[styles.playBtn, disabled && { opacity: 0.5 }]}>
          {p.buffering && p.playing ? (
            <ActivityIndicator color={c.cream} />
          ) : (
            <Icon name={p.playing ? 'pause' : 'play'} size={30} color={c.cream} />
          )}
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel="Forward 30 seconds" disabled={disabled || !isLoaded} onPress={() => p.skip(30)} style={styles.ctrl}>
          <Skip seconds={30} forward />
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel="Next episode" onPress={() => p.next(1)} style={styles.ctrl}>
          <Icon name="next" size={24} />
        </Tap>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Tap accessibilityRole="button" accessibilityLabel={`Playback speed ${formatSpeed(p.speed)}. Tap to change`} onPress={p.cycleSpeed} style={styles.pill}>
          <Text style={[styles.pillText, { fontFamily: Fonts.sansBold }]}>{formatSpeed(p.speed)}</Text>
        </Tap>
        <Tap
          accessibilityRole="button"
          accessibilityState={{ selected: p.sleepOn }}
          accessibilityLabel={p.sleepOn ? 'Sleep timer on: stops in 30 minutes. Tap to cancel' : 'Sleep timer: stop after 30 minutes'}
          onPress={p.toggleSleep}
          style={[styles.pill, p.sleepOn && { backgroundColor: c.brown, borderColor: c.brown }]}>
          <Icon name="moon" size={16} color={p.sleepOn ? c.cream : c.brownDark} />
          <Text style={[styles.pillText, p.sleepOn && { color: c.cream }]}>{p.sleepOn ? '30 min' : 'Sleep'}</Text>
        </Tap>
        <Tap
          accessibilityRole="button"
          onPress={() => episode && Share.share({ message: `${episode.title} — ${p.podcast.title}${episode.audioUrl ? ` ${episode.audioUrl}` : ''}` })}
          style={styles.pill}>
          <Icon name="share" size={16} />
          <Text style={styles.pillText}>Share</Text>
        </Tap>
      </View>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: c.parchment, paddingHorizontal: 24, justifyContent: 'space-between', gap: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: c.eyebrow },
  show: { fontFamily: Fonts.sansSemiBold, fontSize: 13, color: c.text },
  art: {
    alignSelf: 'center',
    width: 318,
    maxWidth: '100%',
    aspectRatio: 1,
    borderRadius: 30,
    backgroundColor: c.brown,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    shadowColor: c.brownDark,
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  title: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 32, color: c.text },
  speaker: { fontFamily: Fonts.sans, fontSize: 15, color: c.textMuted },
  notice: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, color: c.textMuted },
  time: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: c.textMuted, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  ctrl: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: c.brown,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.brownDark,
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
    borderColor: c.lineStrong,
    backgroundColor: c.ivory,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillText: { fontFamily: Fonts.sansSemiBold, fontSize: 13, color: c.brownDark },
});
