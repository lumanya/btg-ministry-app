import { ReactNode, useEffect, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '@/state/theme';

/**
 * Sections rise and fade in, one after another, when a screen opens.
 * Reanimated skips these when the phone's "reduce motion" setting is on.
 */
export function Appear({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 70).duration(420).easing(Easing.out(Easing.cubic))} style={style}>
      {children}
    </Animated.View>
  );
}

/** A softly pulsing block shown while content loads. */
export function Skeleton({ height, width, radius = 12, style }: { height: number; width?: number | `${number}%`; radius?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.55, { duration: 700 })), -1);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View accessible={false} style={[{ height, width, borderRadius: radius, backgroundColor: c.sand }, animated, style]} />;
}

/** Pops its child with a small spring whenever `trigger` changes (e.g. a streak going up). */
export function Pop({ trigger, children, style }: { trigger: unknown; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    // Stay still when the screen first opens; only celebrate real changes.
    if (first.current) {
      first.current = false;
      return;
    }
    scale.value = withSequence(withTiming(1.18, { duration: 120 }), withSpring(1, { damping: 9, stiffness: 180 }));
  }, [trigger, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[animated, style]}>{children}</Animated.View>;
}
