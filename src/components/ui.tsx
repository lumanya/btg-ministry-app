import { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/icon';
import { Brand, Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { useColors, useStyles } from '@/state/theme';

/* ---------- Text ---------- */

export function Title({
  children,
  size = 36,
  style,
}: {
  children: ReactNode;
  size?: number;
  style?: StyleProp<TextStyle>;
}) {
  const c = useColors();
  return (
    <Text
      accessibilityRole="header"
      style={[{ fontFamily: Fonts.display, fontSize: size, lineHeight: size * 1.05, color: c.text }, style]}>
      {children}
    </Text>
  );
}

export function Eyebrow({ children, onDark = false, style }: { children: ReactNode; onDark?: boolean; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  const styles = useStyles(createStyles);
  return <Text style={[styles.eyebrow, onDark && { color: c.gold }, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useStyles(createStyles);
  return <Text style={[styles.body, style]}>{children}</Text>;
}

/* ---------- Pressables ---------- */

/** A Pressable that shrinks slightly while pressed. */
export function Tap({ style, children, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const styles = useStyles(createStyles);
  return (
    <Pressable {...rest} style={({ pressed }) => [style, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

type ButtonVariant = 'primary' | 'outline' | 'cream';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const styles = useStyles(createStyles);
  const v = buttonVariants(c)[variant];
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.button, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Text style={[styles.buttonLabel, { color: v.fg }]}>{label}</Text>
      {icon ? <Icon name={icon} size={18} color={v.fg} /> : null}
    </Tap>
  );
}

const buttonVariants = (c: Palette): Record<ButtonVariant, { bg: string; fg: string; border: string }> => ({
  primary: { bg: c.brown, fg: c.cream, border: c.brown },
  outline: { bg: 'transparent', fg: c.brownDark, border: c.accent },
  // Cream buttons sit on brown cards, so their text stays dark brown in both modes.
  cream: { bg: c.cream, fg: Brand.brownDark, border: c.cream },
});

export function IconButton({
  icon,
  label,
  onPress,
  variant = 'outline',
  size = 44,
  iconSize = 20,
  filled,
  selected,
  style,
}: {
  icon: IconName;
  /** Read aloud by screen readers; required because the button has no text. */
  label: string;
  onPress?: () => void;
  variant?: 'outline' | 'plain' | 'solid' | 'cream';
  size?: number;
  iconSize?: number;
  filled?: boolean;
  /** For toggles: announces the pressed state. */
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const styles = useStyles(createStyles);
  const look = {
    outline: { bg: c.white, border: c.line, fg: c.brownDark },
    plain: { bg: 'transparent', border: 'transparent', fg: c.brownDark },
    solid: { bg: c.brown, border: c.brown, fg: c.cream },
    cream: { bg: c.cream, border: c.cream, fg: Brand.brown },
  }[variant];
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      hitSlop={size < 44 ? (44 - size) / 2 : undefined}
      style={[
        styles.iconButton,
        { width: size, height: size, backgroundColor: look.bg, borderColor: look.border },
        style,
      ]}>
      <Icon name={icon} size={iconSize} color={look.fg} filled={filled} />
    </Tap>
  );
}

/* ---------- Layout ---------- */

/** Standard scrolling screen with the safe-area inset at the top. */
export function Screen({
  children,
  gap = 24,
  background,
  contentStyle,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  gap?: number;
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  /** Pull-to-refresh: pass both to enable it. */
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: background ?? c.ivory }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} progressViewOffset={insets.top} />
        ) : undefined
      }
      contentContainerStyle={[
        { paddingTop: insets.top + 12, paddingHorizontal: ScreenPadding, paddingBottom: 32, gap },
        contentStyle,
      ]}>
      {children}
    </ScrollView>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.sectionHeader}>
      <Eyebrow>{title}</Eyebrow>
      {action ? (
        <Pressable accessibilityRole="link" onPress={onAction} hitSlop={8} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles(createStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ProgressBar({ value, track, fill }: { value: number; track?: string; fill?: string }) {
  const c = useColors();
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: track ?? c.rail, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: 4, backgroundColor: fill ?? c.accent }} />
    </View>
  );
}

/** Red "LIVE" badge used on the livestream. */
export function LiveBadge() {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.liveBadge} accessibilityLabel="Live now">
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  eyebrow: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: c.eyebrow,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: c.textMuted,
  },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  button: {
    minHeight: 52,
    paddingHorizontal: 24,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonLabel: { fontFamily: Fonts.sansSemiBold, fontSize: 16 },
  iconButton: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  sectionAction: { minHeight: 44, justifyContent: 'center' },
  sectionActionText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.accent },
  card: {
    backgroundColor: c.white,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: c.live,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.white },
  liveText: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 1.3, color: c.white },
});
