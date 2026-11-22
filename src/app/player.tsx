import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { t } from '@/i18n';
import { EagleMark } from '@/components/eagle-mark';
import { Icon } from '@/components/icon';
import { Scrubber } from '@/components/scrubber';
import { IconButton, Tap } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { formatClock } from '@/lib/podcast';
import { formatSpeed, usePlayer } from '@/state/player';

/** The full player: deep ink and gold in light and dark mode, for listening at night. */
const INK = '#17120E';
const PANEL = '#221B15';
const GOLD = '#D4AF73';
const WHITE = '#FFFFFF';
const SOFT = 'rgba(255,255,255,0.72)';

/** Circular "skip" icon with the number of seconds inside. */
function Skip({ seconds, forward }: { seconds: number; forward?: boolean }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 24 24">
      <Path d={forward ? 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3' : 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3'} stroke={WHITE} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Path d={forward ? 'M19.5 4v3.5H16' : 'M4.5 4v3.5H8'} stroke={WHITE} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <SvgText x={12} y={15.2} textAnchor="middle" fontSize={7} fontWeight="700" fill={WHITE}>
        {String(seconds)}
      </SvgText>
    </Svg>
  );
}

export default function PlayerScreen() {
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
  const sleepLabel = p.sleepOn ? t('{n} min', { n: p.sleepMinutes }) : t('Sleep');

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 }]}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <IconButton icon="down" label={t('Close player')} variant="plain" iconSize={24} color={WHITE} onPress={close} />
        <View style={{ alignItems: 'center', gap: 2, flex: 1 }}>
          <Text style={styles.kicker}>{t('Now playing')}</Text>
          <Text style={styles.show} numberOfLines={1}>
            {p.podcast.title}
          </Text>
        </View>
        <IconButton icon="queue" label={t('All episodes')} variant="plain" color={WHITE} onPress={() => router.navigate('/podcast')} />
      </View>

      <View style={styles.art}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
        ) : (
          <View style={{ alignItems: 'center', gap: 18 }}>
            <EagleMark height={150} color={GOLD} />
            {episode?.series ? <Text style={styles.artSeries}>{episode.series}</Text> : null}
          </View>
        )}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={3}>
          {episode?.title ?? t('No episodes yet')}
        </Text>
        <Text style={styles.speaker}>Iman Mwakanyamale</Text>
        {disabled && episode ? <Text style={styles.notice}>{t('This is a sample episode. Audio arrives when the podcast feed is connected.')}</Text> : null}
      </View>

      <View style={{ gap: 4 }}>
        <Scrubber position={position} duration={duration} onSeek={p.seekTo} disabled={disabled || !isLoaded} night />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.time}>{formatClock(position)}</Text>
          <Text style={styles.time}>{duration > 0 ? `−${formatClock(Math.max(0, duration - position))}` : '--:--'}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Tap accessibilityRole="button" accessibilityLabel={t('Previous episode')} onPress={() => p.next(-1)} style={styles.ctrl}>
          <Icon name="prev" size={24} color={SOFT} />
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel={t('Back 15 seconds')} disabled={disabled || !isLoaded} onPress={() => p.skip(-15)} style={styles.ctrl}>
          <Skip seconds={15} />
        </Tap>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={p.playing ? t('Pause') : t('Play')}
          disabled={disabled}
          onPress={() => (p.episode || !episode ? p.toggle() : p.play(episode))}
          style={[styles.playBtn, disabled && { opacity: 0.5 }]}>
          {p.buffering && p.playing ? <ActivityIndicator color={INK} /> : <Icon name={p.playing ? 'pause' : 'play'} size={30} color={INK} filled />}
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel={t('Forward 30 seconds')} disabled={disabled || !isLoaded} onPress={() => p.skip(30)} style={styles.ctrl}>
          <Skip seconds={30} forward />
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel={t('Next episode')} onPress={() => p.next(1)} style={styles.ctrl}>
          <Icon name="next" size={24} color={SOFT} />
        </Tap>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={t('Playback speed {speed}. Tap to change', { speed: formatSpeed(p.speed) })}
          onPress={p.cycleSpeed}
          style={[styles.pill, p.speed !== 1 && styles.pillOn]}>
          <Text style={[styles.pillText, { fontFamily: Fonts.sansBold }, p.speed !== 1 && { color: INK }]}>{formatSpeed(p.speed)}</Text>
        </Tap>
        <Tap
          accessibilityRole="button"
          accessibilityState={{ selected: p.sleepOn }}
          accessibilityLabel={p.sleepOn ? t('Sleep timer: stops in {n} minutes. Tap to change', { n: p.sleepMinutes }) : t('Sleep timer: tap to stop playing after a while')}
          onPress={p.toggleSleep}
          style={[styles.pill, p.sleepOn && styles.pillOn]}>
          <Icon name="moon" size={16} color={p.sleepOn ? INK : WHITE} />
          <Text style={[styles.pillText, p.sleepOn && { color: INK }]}>{sleepLabel}</Text>
        </Tap>
        <Tap
          accessibilityRole="button"
          onPress={() => episode && Share.share({ message: `${episode.title} — ${p.podcast.title}${episode.audioUrl ? ` ${episode.audioUrl}` : ''}` })}
          style={styles.pill}>
          <Icon name="share" size={16} color={WHITE} />
          <Text style={styles.pillText}>{t('Share')}</Text>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: INK, paddingHorizontal: 24, justifyContent: 'space-between', gap: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: GOLD },
  show: { fontFamily: Fonts.sansSemiBold, fontSize: 13, color: WHITE },
  art: {
    alignSelf: 'center',
    width: 318,
    maxWidth: '100%',
    aspectRatio: 1,
    borderRadius: 28,
    backgroundColor: PANEL,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artSeries: { fontFamily: Fonts.displayItalic, fontSize: 20, color: SOFT, textAlign: 'center', paddingHorizontal: 24 },
  title: { fontFamily: Fonts.display, fontSize: 31, lineHeight: 33, color: WHITE },
  speaker: { fontFamily: Fonts.sans, fontSize: 15, color: SOFT },
  notice: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, color: SOFT },
  time: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: SOFT, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  ctrl: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  pill: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillOn: { backgroundColor: GOLD, borderColor: GOLD },
  pillText: { fontFamily: Fonts.sansSemiBold, fontSize: 13, color: WHITE },
});
