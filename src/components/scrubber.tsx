import { useRef, useState } from 'react';
import { GestureResponderEvent, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { formatClock } from '@/lib/podcast';

/**
 * Playback position bar. Tap or drag to seek; screen readers can swipe up
 * or down to skip 15 seconds.
 */
export function Scrubber({
  position,
  duration,
  onSeek,
  disabled = false,
}: {
  position: number;
  duration: number;
  onSeek: (seconds: number) => void;
  disabled?: boolean;
}) {
  const [width, setWidth] = useState(1);
  const [drag, setDrag] = useState<number | null>(null);
  // Left edge of the bar on screen, measured when a touch starts.
  const left = useRef(0);

  const enabled = !disabled && duration > 0;
  const fractionAt = (e: GestureResponderEvent) => Math.min(1, Math.max(0, (e.nativeEvent.pageX - left.current) / width));

  const fraction = drag ?? (duration > 0 ? Math.min(1, position / duration) : 0);
  const shown = drag !== null ? drag * duration : position;

  return (
    <View
      onLayout={(e) => setWidth(Math.max(1, e.nativeEvent.layout.width))}
      onStartShouldSetResponder={() => enabled}
      onMoveShouldSetResponder={() => enabled}
      onResponderGrant={(e) => {
        left.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
        setDrag(fractionAt(e));
      }}
      onResponderMove={(e) => setDrag(fractionAt(e))}
      onResponderRelease={(e) => {
        const f = fractionAt(e);
        setDrag(null);
        onSeek(f * duration);
      }}
      onResponderTerminate={() => setDrag(null)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Playback position"
      accessibilityValue={{ text: duration > 0 ? `${formatClock(shown)} of ${formatClock(duration)}` : 'Not started' }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (!enabled) return;
        const delta = e.nativeEvent.actionName === 'increment' ? 15 : -15;
        onSeek(Math.max(0, Math.min(duration, position + delta)));
      }}
      hitSlop={{ top: 12, bottom: 12 }}
      style={styles.track}>
      {/* Children ignore touches so every touch position is measured against the bar itself. */}
      <View pointerEvents="none" style={styles.rail}>
        <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.thumb, { left: `${fraction * 100}%` }, drag !== null && styles.thumbActive, !enabled && { opacity: 0.4 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 28, justifyContent: 'center' },
  rail: { height: 4, borderRadius: 2, backgroundColor: '#D9C9B1', overflow: 'hidden' },
  fill: { height: 4, backgroundColor: Colors.brown },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: Colors.brown,
    borderWidth: 2,
    borderColor: Colors.parchment,
  },
  thumbActive: { width: 22, height: 22, marginLeft: -11, borderRadius: 11 },
});
