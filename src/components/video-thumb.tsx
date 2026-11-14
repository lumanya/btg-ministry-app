import { Image } from 'expo-image';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { SermonArt } from '@/components/art';
import { Icon } from '@/components/icon';
import { LiveBadge } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import type { ArtTone } from '@/content/sample';
import type { FeedVideo } from '@/lib/video';

/**
 * A video's YouTube thumbnail, or the BTG arch artwork when there is none.
 */
export function VideoThumb({
  video,
  height,
  titleSize = 21,
  tone = 'deep',
  play = 'none',
  radius = 16,
  style,
}: {
  video: FeedVideo;
  height: number;
  titleSize?: number;
  tone?: ArtTone;
  /** Where to draw the play button. */
  play?: 'none' | 'corner' | 'center';
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const playSize = height >= 160 ? 56 : 40;
  const playButton =
    play === 'none' ? null : (
      <View
        style={[
          styles.play,
          { width: playSize, height: playSize, borderRadius: playSize / 2 },
          play === 'corner' ? { right: 12, bottom: 12 } : { left: '50%', top: '50%', marginLeft: -playSize / 2, marginTop: -playSize / 2 },
        ]}>
        <Icon name="play" size={playSize * 0.42} color={Colors.brown} />
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
    return (
      <SermonArt title={video.title} tone={tone} height={height} titleSize={titleSize} style={[{ borderRadius: radius }, style]}>
        {badges}
        {playButton}
      </SermonArt>
    );
  }

  return (
    <View style={[{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: Colors.night }, style]}>
      <Image source={{ uri: video.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessible={false} />
      {badges}
      {playButton}
    </View>
  );
}

const styles = StyleSheet.create({
  play: {
    position: 'absolute',
    backgroundColor: Colors.cream,
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
  durationText: { fontFamily: Fonts.sansSemiBold, fontSize: 11, color: Colors.cream, fontVariant: ['tabular-nums'] },
});
