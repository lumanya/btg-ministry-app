import { Image } from 'expo-image';
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import type { ArtTone } from '@/content/sample';

export const eagleImage = require('@/assets/images/eagle.png');
export const eagleCreamImage = require('@/assets/images/eagle-cream.png');
export const logoImage = require('@/assets/images/logo-full.png');

/** Width ÷ height of the eagle emblem images. */
export const EAGLE_RATIO = 0.73;

export const tones: Record<ArtTone, { bg: string; line: string; text: string; eagle: number }> = {
  brown: { bg: Colors.brown, line: Colors.goldLine, text: Colors.cream, eagle: eagleCreamImage },
  deep: { bg: Colors.deep, line: Colors.goldLineDeep, text: Colors.cream, eagle: eagleCreamImage },
  sand: { bg: Colors.sand, line: Colors.lineStrong, text: Colors.text, eagle: eagleImage },
};

export function Eagle({ height, light = false }: { height: number; light?: boolean }) {
  return (
    <Image
      source={light ? eagleCreamImage : eagleImage}
      style={{ width: height * EAGLE_RATIO, height }}
      contentFit="contain"
      accessible={false}
    />
  );
}

/**
 * The BTG "arch": the eagle standing inside a thin temple arch.
 * Used as artwork for sermons and podcasts until real thumbnails exist.
 */
export function Arch({
  tone = 'brown',
  width,
  height,
  eagleHeight,
  label,
}: {
  tone?: ArtTone;
  width: number;
  height: number;
  eagleHeight: number;
  label?: string;
}) {
  const t = tones[tone];
  return (
    <View
      style={{
        width,
        height,
        borderWidth: 1,
        borderColor: t.line,
        borderTopLeftRadius: width / 2,
        borderTopRightRadius: width / 2,
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 4,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: Math.max(4, height * 0.06),
        gap: 10,
      }}>
      <Image source={t.eagle} style={{ width: eagleHeight * EAGLE_RATIO, height: eagleHeight }} contentFit="contain" />
      {label ? <Text style={[styles.archLabel, { color: Colors.gold }]}>{label}</Text> : null}
    </View>
  );
}

/** Wide artwork used for sermon thumbnails: arch on the left, title on the right. */
export function SermonArt({
  title,
  tone = 'deep',
  height = 132,
  titleSize = 21,
  style,
  children,
}: {
  title: string;
  tone?: ArtTone;
  height?: number;
  titleSize?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const t = tones[tone];
  const archH = Math.round(height * 0.76);
  const archW = Math.round(archH * 0.58);
  return (
    <View style={[styles.sermonArt, { height, backgroundColor: t.bg, padding: Math.round(height * 0.1) }, style]}>
      <Arch tone={tone} width={archW} height={archH} eagleHeight={Math.round(archH * 0.58)} />
      <Text style={[styles.sermonTitle, { color: t.text, fontSize: titleSize, lineHeight: titleSize * 1.02 }]} numberOfLines={3}>
        {title}
      </Text>
      {children}
    </View>
  );
}

/** The scroll from the logo: a rolled bar above and below the content. */
export function ScrollCard({ children }: { children: ReactNode }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Roll />
      <View style={styles.paper}>{children}</View>
      <Roll />
    </View>
  );
}

function Roll() {
  return (
    <View style={styles.roll} accessible={false}>
      <View style={styles.rollKnob} />
      <View style={styles.rollBar}>
        <View style={styles.rollShine} />
        <View style={styles.rollShade} />
      </View>
      <View style={styles.rollKnob} />
    </View>
  );
}

const styles = StyleSheet.create({
  archLabel: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase' },
  sermonArt: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
  },
  sermonTitle: { flex: 1, fontFamily: Fonts.display },
  roll: { width: '100%', flexDirection: 'row', alignItems: 'center' },
  rollKnob: { width: 10, height: 28, borderRadius: 4, backgroundColor: Colors.brownDark },
  rollBar: { flex: 1, height: 20, borderRadius: 4, backgroundColor: Colors.brown, overflow: 'hidden', justifyContent: 'space-between' },
  rollShine: { height: 3, backgroundColor: 'rgba(255,255,255,0.16)' },
  rollShade: { height: 6, backgroundColor: 'rgba(31,19,10,0.22)' },
  paper: {
    width: '92%',
    backgroundColor: Colors.paper,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.lineStrong,
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 12,
  },
});
