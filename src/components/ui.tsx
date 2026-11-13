import { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
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
import { Colors, Fonts, Radius, ScreenPadding } from '@/constants/theme';

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
  return (
    <Text
      accessibilityRole="header"
      style={[{ fontFamily: Fonts.display, fontSize: size, lineHeight: size * 1.05, color: Colors.text }, style]}>
      {children}
    </Text>
  );
}

export function Eyebrow({ children, onDark = false, style }: { children: ReactNode; onDark?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, onDark && { color: Colors.gold }, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

/* ---------- Pressables ---------- */

/** A Pressable that shrinks slightly while pressed. */
export function Tap({ style, children, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; children: ReactNode }) {
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
  const v = buttonVariants[variant];
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

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: Colors.brown, fg: Colors.cream, border: Colors.brown },
  outline: { bg: 'transparent', fg: Colors.brownDark, border: Colors.brown },
  cream: { bg: Colors.cream, fg: Colors.brownDark, border: Colors.cream },
};

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
  const look = {
    outline: { bg: Colors.white, border: Colors.line, fg: Colors.brownDark },
    plain: { bg: 'transparent', border: 'transparent', fg: Colors.brownDark },
    solid: { bg: Colors.brown, border: Colors.brown, fg: Colors.cream },
    cream: { bg: Colors.cream, border: Colors.cream, fg: Colors.brown },
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
  background = Colors.ivory,
  contentStyle,
}: {
  children: ReactNode;
  gap?: number;
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        { paddingTop: insets.top + 12, paddingHorizontal: ScreenPadding, paddingBottom: 32, gap },
        contentStyle,
      ]}>
      {children}
    </ScrollView>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
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
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ProgressBar({ value, track = Colors.sand, fill = Colors.brown }: { value: number; track?: string; fill?: string }) {
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: 4, backgroundColor: fill }} />
    </View>
  );
}

/** Red "LIVE" badge used on the livestream. */
export function LiveBadge() {
  return (
    <View style={styles.liveBadge} accessibilityLabel="Live now">
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>LIVE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.eyebrow,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textMuted,
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
  sectionActionText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Colors.brown },
  card: {
    backgroundColor: Colors.white,
    borderColor: Colors.line,
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
    backgroundColor: Colors.live,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white },
  liveText: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 1.3, color: Colors.white },
});
