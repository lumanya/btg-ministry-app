import { Image } from 'expo-image';
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Fonts, Palette } from '@/constants/theme';
import type { ArtTone } from '@/content/sample';
import { useColors, useStyles, useTheme } from '@/state/theme';

export const eagleImage = require('@/assets/images/eagle.png');
/** Gold eagle for dark tiles (the cream one it replaced is still in assets). */
export const eagleCreamImage = require('@/assets/images/eagle-gold.png');
export const logoImage = require('@/assets/images/logo-full.png');

/** Width ÷ height of the eagle emblem images. */
export const EAGLE_RATIO = 0.73;

export type Tone = { bg: string; line: string; text: string; eagle: number; lightEagle: boolean };

/**
 * Artwork tile colours: deep ink with the gold eagle, in light and dark mode,
 * so series, podcast and event artwork match the app icon.
 */
export function tonesFor(_c: Palette, _isDark: boolean): Record<ArtTone, Tone> {
  const base = { line: 'rgba(212,175,115,0.45)', text: '#FFFFFF', eagle: eagleCreamImage, lightEagle: true };
  return {
    brown: { ...base, bg: '#17120E' },
    deep: { ...base, bg: '#221B15' },
    sand: { ...base, bg: '#2B2119' },
  };
}

export function useTones() {
  const { colors, isDark } = useTheme();
  return tonesFor(colors, isDark);
}

/**
 * The eagle emblem. Brown on light backgrounds and cream on dark ones;
 * pass `light` to force the cream version (for brown or dark tiles).
 */
export function Eagle({ height, light }: { height: number; light?: boolean }) {
  const { isDark } = useTheme();
  return (
    <Image
      source={(light ?? isDark) ? eagleCreamImage : eagleImage}
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
  const c = useColors();
  const styles = useStyles(createStyles);
  const t = useTones()[tone];
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
      {label ? <Text style={[styles.archLabel, { color: c.eyebrow }]}>{label}</Text> : null}
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
  const styles = useStyles(createStyles);
  const t = useTones()[tone];
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

/** A passage set between two thin gold rules (the scroll, simplified). */
export function ScrollCard({ children }: { children: ReactNode }) {
  const styles = useStyles(createStyles);
  return <View style={styles.paper}>{children}</View>;
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  archLabel: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase' },
  sermonArt: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
  },
  sermonTitle: { flex: 1, fontFamily: Fonts.display },
  paper: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: c.goldLine,
    paddingVertical: 24,
    gap: 12,
  },
});
