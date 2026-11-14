import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Eagle } from '@/components/art';
import { Icon, IconName } from '@/components/icon';
import { IconButton, Tap } from '@/components/ui';
import { Fonts, Palette, Radius } from '@/constants/theme';
import { tick } from '@/lib/haptics';
import { useFeed } from '@/state/feed';
import { usePlayer } from '@/state/player';
import { useColors, useStyles } from '@/state/theme';

const ICONS: Record<string, IconName> = {
  home: 'home',
  sermons: 'sermons',
  live: 'live',
  podcast: 'podcast',
  devotional: 'devotional',
};

/**
 * The bottom bar: a mini player that follows the listener across every tab,
 * then the five tabs. The live tab shows a red dot only while a stream is live.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const styles = useStyles(createStyles);
  const { feed } = useFeed();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <MiniPlayer />
      <View style={styles.row} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const onPress = () => {
            tick();
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <TabItem
              key={route.key}
              label={label}
              icon={ICONS[route.name] ?? 'home'}
              focused={focused}
              dot={route.name === 'live' && !!feed.live}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({ label, icon, focused, dot, onPress }: { label: string; icon: IconName; focused: boolean; dot: boolean; onPress: () => void }) {
  const c = useColors();
  const styles = useStyles(createStyles);
  const active = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    active.value = withSpring(focused ? 1 : 0, { damping: 16, stiffness: 220 });
  }, [focused, active]);

  const pill = useAnimatedStyle(() => ({
    opacity: active.value,
    transform: [{ scaleX: 0.6 + active.value * 0.4 }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={dot ? `${label}, streaming now` : label}
      onPress={onPress}
      style={styles.item}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, pill]} />
        {/* Above the animated pill (its transform puts it on its own layer). */}
        <View style={{ zIndex: 1 }}>
          <Icon name={icon} color={focused ? c.accent : c.textSubtle} dot={dot} />
        </View>
      </View>
      <Text style={[styles.label, { color: focused ? c.brownDark : c.textSubtle }, focused && { fontFamily: Fonts.sansBold }]}>{label}</Text>
    </Pressable>
  );
}

/** Shown once something has been played; tap to open the full player. */
function MiniPlayer() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const p = usePlayer();
  const episode = p.episode ?? p.resume?.episode ?? null;

  const position = p.episode ? p.position : p.resume?.position ?? 0;
  const duration = p.episode ? p.duration : p.resume?.duration ?? 0;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const width = useSharedValue(progress);
  useEffect(() => {
    width.value = withTiming(progress, { duration: 450 });
  }, [progress, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  if (!episode) return null;

  return (
    <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOutDown.duration(200)} style={styles.miniWrap}>
      <View style={styles.mini}>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={`Open the player: ${episode.title}`}
          onPress={() => router.push('/player')}
          style={styles.miniMain}>
          <View style={styles.miniArt}>
            <Eagle height={36} light />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.miniTitle} numberOfLines={1}>
              {episode.title}
            </Text>
            <Text style={styles.miniMeta} numberOfLines={1}>
              {p.playing ? 'Playing' : p.episode ? 'Paused' : 'Continue listening'} · {p.podcast.title}
            </Text>
          </View>
        </Tap>
        <IconButton
          icon={p.playing ? 'pause' : 'play'}
          label={p.playing ? 'Pause' : `Play ${episode.title}`}
          variant="cream"
          iconSize={18}
          onPress={() => (p.episode ? p.toggle() : p.play(episode))}
        />
        <View style={styles.miniTrack} pointerEvents="none">
          <Animated.View style={[styles.miniFill, fill, { backgroundColor: c.gold }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    bar: { backgroundColor: c.ivory, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.lineStrong, paddingTop: 6 },
    row: { flexDirection: 'row' },
    item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 54 },
    iconWrap: { width: 56, height: 30, alignItems: 'center', justifyContent: 'center' },
    pill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 15, backgroundColor: c.sand },
    label: { fontFamily: Fonts.sansSemiBold, fontSize: 11 },
    miniWrap: { paddingHorizontal: 10, paddingBottom: 6 },
    mini: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      padding: 6,
      paddingLeft: 8,
      borderRadius: Radius.lg,
      backgroundColor: c.deep,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    miniMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
    miniArt: { width: 44, height: 44, borderRadius: 10, backgroundColor: c.brown, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 },
    miniTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.cream },
    miniMeta: { fontFamily: Fonts.sans, fontSize: 12, color: c.creamMuted },
    miniTrack: { position: 'absolute', left: 14, right: 14, bottom: 0, height: 2, backgroundColor: 'rgba(248,239,224,0.15)' },
    miniFill: { height: 2 },
  });
