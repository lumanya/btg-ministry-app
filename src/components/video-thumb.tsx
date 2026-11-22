import { Image } from 'expo-image';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { EagleMark } from '@/components/eagle-mark';
import { Icon } from '@/components/icon';
import { LiveBadge } from '@/components/ui';
import { Fonts, Palette } from '@/constants/theme';
import type { ArtTone } from '@/content/sample';
import type { FeedVideo } from '@/lib/video';
import { smallThumbnail, useDataSaver } from '@/state/data-saver';
import { useColors, useStyles } from '@/state/theme';

/**
 * A video's YouTube thumbnail, or the BTG arch artwork when there is none.
 */
export function VideoThumb({
  video,
  height,
  titleSize = 21,
  play = 'none',
  radius = 16,
  style,
}: {
  video: FeedVideo;
  height: number;
  titleSize?: number;
  /** Kept for callers; the fallback artwork is always ink and gold now. */
  tone?: ArtTone;
  /** Where to draw the play button. */
  play?: 'none' | 'corner' | 'center';
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const styles = useStyles(createStyles);
  const saving = useDataSaver().active;
  const playSize = height >= 160 ? 56 : 40;
  const playButton =
    play === 'none' ? null : (
      <View
        style={[
          styles.play,
          { width: playSize, height: playSize, borderRadius: playSize / 2 },
          play === 'corner' ? { right: 12, bottom: 12 } : { left: '50%', top: '50%', marginLeft: -playSize / 2, marginTop: -playSize / 2 },
        ]}>
        <Icon name="play" size={playSize * 0.42} color={c.brown} />
      </View>
    );

  const badges = (
    <>
      {video.kind === 'live' ? (
        <View style={{ position: 'absolute', top: 10, left: 10 }}>
          <LiveBadge />
        </View>
      ) : null}
      {video.duration && height >= 60 ? (
        <View style={styles.duration}>
          <Text style={styles.durationText}>{video.duration}</Text>
        </View>
      ) : null}
    </>
  );

  if (!video.thumbnail) {
    // No YouTube picture: the gold eagle on ink, with the title set in the display serif.
    const mark = Math.max(18, Math.min(56, Math.round(height * 0.28)));
    const showTitle = height >= 96 && play !== 'center';
    return (
      <View style={[styles.fallback, { height, borderRadius: radius }, style]}>
        <View style={{ position: 'absolute', left: 14, top: 12 }}>
          <EagleMark height={mark} color="#D4AF73" />
        </View>
        {showTitle ? (
          <Text
            style={[
              styles.fallbackTitle,
              { fontSize: Math.min(titleSize, 26), lineHeight: Math.min(titleSize, 26) * 1.05, paddingRight: play === 'corner' ? 76 : 16, bottom: video.duration ? 36 : 14 },
            ]}
            numberOfLines={2}>
            {video.title}
          </Text>
        ) : null}
        {badges}
        {playButton}
      </View>
    );
  }

  return (
    <View style={[{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: c.artDeep }, style]}>
      <Image source={{ uri: smallThumbnail(video.thumbnail, saving) ?? video.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessible={false} />
      {badges}
      {playButton}
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  fallback: { overflow: 'hidden', backgroundColor: '#17120E' },
  fallbackTitle: { position: 'absolute', left: 14, fontFamily: Fonts.display, color: '#FFFFFF' },
  play: {
    position: 'absolute',
    backgroundColor: c.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(31,19,10,0.8)',
  },
  durationText: { fontFamily: Fonts.sansSemiBold, fontSize: 11, color: c.cream, fontVariant: ['tabular-nums'] },
});
