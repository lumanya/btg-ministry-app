import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Arch } from '@/components/art';
import { Icon } from '@/components/icon';
import { Tap } from '@/components/ui';
import { Fonts, Palette, Radius } from '@/constants/theme';
import type { FeedPlaylist } from '@/lib/video';
import { useColors, useStyles } from '@/state/theme';

/** A series (YouTube playlist) tile: cover, a stacked-cards edge, title and count. */
export function PlaylistCard({ playlist, onPress, width = 220 }: { playlist: FeedPlaylist; onPress: () => void; width?: number }) {
  const c = useColors();
  const styles = useStyles(createStyles);
  const height = Math.round(width * 0.5625);
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${playlist.title} series, ${playlist.count} teachings`}
      onPress={onPress}
      style={{ width, gap: 10 }}>
      <View style={{ paddingTop: 8 }}>
        {/* Two thin layers behind the cover read as "a stack of teachings". */}
        <View style={[styles.layer, { top: 0, left: 16, right: 16 }]} />
        <View style={[styles.layer, { top: 4, left: 8, right: 8, backgroundColor: c.sand }]} />
        <View style={[styles.cover, { height }]}>
          {playlist.thumbnail ? (
            <Image source={{ uri: playlist.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessible={false} />
          ) : (
            <View style={styles.art}>
              <Arch tone="brown" width={Math.round(height * 0.5)} height={Math.round(height * 0.78)} eagleHeight={Math.round(height * 0.46)} />
            </View>
          )}
          <View style={styles.count}>
            <Icon name="sermons" size={13} color="#FFFFFF" />
            <Text style={styles.countText}>{playlist.count}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {playlist.title}
      </Text>
    </Tap>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    layer: { position: 'absolute', height: 20, borderRadius: Radius.md, backgroundColor: c.line },
    cover: { borderRadius: Radius.md, overflow: 'hidden', backgroundColor: c.artDeep },
    art: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.artBrown },
    count: {
      position: 'absolute',
      right: 8,
      bottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: 'rgba(28,19,12,0.78)',
    },
    countText: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: '#FFFFFF' },
    title: { fontFamily: Fonts.display, fontSize: 21, lineHeight: 23, color: c.text },
  });
