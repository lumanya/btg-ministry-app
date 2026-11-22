import { useEvent, useEventListener } from 'expo';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Eagle } from '@/components/art';
import { Icon, IconName } from '@/components/icon';
import { Pop } from '@/components/motion';
import { Tap } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { compact, t } from '@/i18n';
import { Clip, clock, seedTitle } from '@/lib/clips';
import { tap } from '@/lib/haptics';
import { formatDay } from '@/lib/video';
import { useClips } from '@/state/clips';
import { useDataSaver } from '@/state/data-saver';
import { recordView, toggleLike, useStat } from '@/state/engagement';
import { useFeed } from '@/state/feed';
import { useLibrary } from '@/state/library';
import { usePlayer } from '@/state/player';
import { useRhythm } from '@/state/rhythm';

/**
 * Seeds (Mbegu): the ministry's one-minute Instagram videos, one per screen,
 * playing on their own as you swipe up. A seed linked to a sermon offers to
 * "grow" into the full message. Seeds are edited from several parts of a
 * sermon, so it opens from the beginning unless staff chose a start point.
 */
const INK = '#0E0B09';
const WHITE = '#FFFFFF';
const SOFT = 'rgba(255,255,255,0.78)';
const GOLD = '#D4AF73';
const BROWN = '#8B5A2B';
const PAPER = '#FBF8F3';
const TEXT = '#241A12';
const MUTED = '#6B5A4A';
/** Seconds before the next seed plays once one with a sermon ends. */
const NEXT_IN = 5;
/** After this many seeds in a row, suggest a full sermon. */
const NUDGE_AFTER = 10;

export default function SeedsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { start, at } = useLocalSearchParams<{ start?: string; at?: string }>();
  const { clips, status, refresh } = useClips();
  const podcast = usePlayer();
  const saving = useDataSaver().active;
  const list = useRef<FlatList<Clip>>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const height = size.height;

  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(true);
  const [muted, setMuted] = useState(false);
  const seen = useRef(new Set<string>());
  const [nudge, setNudge] = useState<'hidden' | 'shown' | 'done'>('hidden');
  const onWatched = useCallback((id: string) => {
    seen.current.add(id);
    if (seen.current.size >= NUDGE_AFTER) setNudge((n) => (n === 'hidden' ? 'shown' : n));
  }, []);

  // Fresh video links when the feed opens (Instagram's expire after a while).
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Pause when another tab or screen covers this one; stop the podcast so they don't overlap.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      if (podcast.playing) podcast.toggle();
      return () => setFocused(false);
      // Only on focus changes, not on every podcast update.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  // Opened from Today at a particular seed: jump to it (`at` changes on every tap).
  const startIndex = start ? clips.findIndex((c) => c.id === start) : -1;
  useEffect(() => {
    if (startIndex < 0 || !height) return;
    const timer = setTimeout(() => {
      list.current?.scrollToIndex({ index: startIndex, animated: false });
      setActive(startIndex);
    }, 0);
    return () => clearTimeout(timer);
  }, [startIndex, height, at]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w !== size.width || h !== size.height) setSize({ width: w, height: h });
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!height) return;
    setActive(Math.round(e.nativeEvent.contentOffset.y / height));
  };
  const goTo = (index: number) => {
    if (index < 0 || index >= clips.length) return;
    list.current?.scrollToIndex({ index, animated: true });
    setActive(index);
  };

  return (
    <View style={{ flex: 1, backgroundColor: INK }} onLayout={onLayout}>
      <StatusBar style="light" />
      {clips.length && height ? (
        <FlatList
          ref={list}
          data={clips}
          keyExtractor={(c) => c.id}
          renderItem={({ item, index }) => (
            <SeedPage
              clip={item}
              width={size.width}
              height={height}
              topInset={insets.top}
              active={focused && index === active}
              activeKey={`${index}:${active}:${focused}`}
              load={index === active || (!saving && Math.abs(index - active) === 1)}
              muted={muted}
              onWatched={onWatched}
              onNext={index < clips.length - 1 ? () => goTo(index + 1) : undefined}
            />
          )}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onMomentumScrollEnd={onScrollEnd}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
        />
      ) : (
        <View style={styles.empty}>
          {status === 'loading' || !height ? (
            <ActivityIndicator color={WHITE} accessibilityLabel={t('Loading seeds')} />
          ) : (
            <Text style={styles.emptyText}>
              {status === 'error' ? t('Couldn’t load seeds. Check your connection and try again.') : t('No seeds yet. New ones appear here when the ministry posts them.')}
            </Text>
          )}
        </View>
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <Text style={styles.topTitle} accessibilityRole="header">
          {t('Seeds')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={muted ? t('Turn sound on') : t('Mute')}
          accessibilityState={{ selected: muted }}
          onPress={() => setMuted((m) => !m)}
          style={styles.round}>
          <Icon name={muted ? 'volumeOff' : 'volume'} size={22} color={WHITE} />
        </Pressable>
      </View>

      {nudge === 'shown' ? (
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} style={[styles.nudge, { top: insets.top + 64 }]} accessibilityLiveRegion="polite">
          <Text style={styles.nudgeTitle}>{t('You’ve watched {n} seeds', { n: NUDGE_AFTER })}</Text>
          <Text style={styles.nudgeText}>{t('Ready to go deeper with a full sermon?')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Tap
              accessibilityRole="button"
              onPress={() => {
                setNudge('done');
                router.navigate('/sermons');
              }}
              style={styles.nudgePrimary}>
              <Text style={styles.nudgePrimaryText}>{t('Open sermons')}</Text>
            </Tap>
            <Tap accessibilityRole="button" onPress={() => setNudge('done')} style={styles.nudgeSecondary}>
              <Text style={styles.nudgeSecondaryText}>{t('Keep watching')}</Text>
            </Tap>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function SeedPage({
  clip,
  width,
  height,
  topInset,
  active,
  activeKey,
  load,
  muted,
  onWatched,
  onNext,
}: {
  clip: Clip;
  width: number;
  height: number;
  topInset: number;
  active: boolean;
  /** Changes whenever this seed becomes current again, so paused/ended reset. */
  activeKey: string;
  load: boolean;
  muted: boolean;
  onWatched: (id: string) => void;
  onNext?: () => void;
}) {
  const router = useRouter();
  const { findVideo } = useFeed();
  const lib = useLibrary();
  const rhythm = useRhythm();
  const stat = useStat('clip', clip.id);
  const [local, setLocal] = useState({ key: activeKey, paused: false, ended: false, more: false });
  const view = local.key === activeKey ? local : { key: activeKey, paused: false, ended: false, more: false };
  const update = (patch: Partial<typeof view>) => setLocal({ ...view, ...patch });

  const player = useVideoPlayer(load && clip.videoUrl ? { uri: clip.videoUrl } : null, (p) => {
    // Seeds that lead to a sermon stop at the end and offer it; others loop.
    p.loop = !clip.sermon;
    p.muted = muted;
    p.timeUpdateEventInterval = 0.25;
  });
  const { currentTime } = useEvent(player, 'timeUpdate', { currentTime: 0, currentLiveTimestamp: null, currentOffsetFromLive: null, bufferedPosition: 0 });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  useEventListener(player, 'playToEnd', () => {
    if (clip.sermon) update({ ended: true });
  });

  const playing = active && !view.paused && !view.ended;
  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  useEffect(() => {
    applyMuted(player, muted);
  }, [muted, player]);

  // Count a view once it has played for two seconds; that also ticks "watch a seed" for today.
  const watched = active && currentTime > 2;
  const { markSeed } = rhythm;
  useEffect(() => {
    if (!watched) return;
    recordView('clip', clip.id);
    markSeed();
    onWatched(clip.id);
  }, [watched, clip.id, markSeed, onWatched]);

  const duration = player.duration || 0;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const started = status === 'readyToPlay' && currentTime > 0.05;
  const sermon = clip.sermon ? findVideo(clip.sermon.youtubeId) : undefined;
  const sermonTitle = clip.sermon ? (sermon?.title ?? clip.title) : null;
  const liked = !!stat?.liked;
  const saved = sermon ? lib.isVideoSaved(sermon.id) : false;
  const title = seedTitle(clip.title);
  const caption = captionBeyondTitle(clip.caption, clip.title);

  const openSermon = (from: number) => {
    if (!clip.sermon) return;
    player.pause();
    router.push({ pathname: '/sermon/[id]', params: { id: clip.sermon.youtubeId, start: String(Math.floor(from)), title: sermonTitle ?? '' } });
  };
  const replay = () => {
    player.replay();
    update({ ended: false, paused: false });
  };

  return (
    <View style={{ width, height, backgroundColor: INK, overflow: 'hidden' }}>
      {clip.videoUrl ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <VideoView player={player} style={{ width, height }} contentFit="cover" nativeControls={false} accessible={false} />
        </View>
      ) : null}
      {!started ? (
        clip.thumbnail ? (
          <Image source={{ uri: clip.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
        ) : (
          <View style={styles.placeholder}>
            <Eagle height={240} light />
          </View>
        )
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? t('Pause') : t('Play')}
        onPress={() => (view.ended ? replay() : update({ paused: !view.paused }))}
        style={StyleSheet.absoluteFill}>
        {active && view.paused ? (
          <View style={styles.bigPlay}>
            <Icon name="play" size={34} color={WHITE} filled />
          </View>
        ) : null}
        {active && load && status === 'loading' ? <ActivityIndicator color={WHITE} style={styles.spinner} /> : null}
      </Pressable>

      {/* Darkens the lower part so the words stay readable over any video. */}
      <View pointerEvents="none" style={styles.shadeLow} />
      <View pointerEvents="none" style={[styles.shadeTop, { height: topInset + 90 }]} />

      <View style={[styles.rail, { bottom: clip.sermon ? 124 : 48 }]}>
        <RailButton
          icon="heart"
          filled={liked}
          on={liked}
          label={liked ? t('Remove your Amen') : t('Say Amen to this seed')}
          text={stat?.likes ? compact(stat.likes) : t('Amen')}
          onPress={() => toggleLike('clip', clip.id)}
        />
        <RailButton
          icon="share"
          label={t('Share this seed')}
          text={t('Share')}
          onPress={() => Share.share({ message: `${title} — Iman Mwakanyamale, BTG Ministry${clip.permalink ? `\n${clip.permalink}` : ''}` })}
        />
        {sermon ? (
          <RailButton
            icon="bookmark"
            filled={saved}
            on={saved}
            label={saved ? t('Remove the sermon from Saved') : t('Save the full sermon for later')}
            text={saved ? t('Saved') : t('Save')}
            onPress={() => {
              tap();
              lib.toggleVideo(sermon);
            }}
          />
        ) : null}
      </View>

      <View style={[styles.words, { bottom: clip.sermon ? 112 : 30 }]} pointerEvents="box-none">
        <View style={styles.byline}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>BTG</Text>
          </View>
          <Text style={styles.name}>Iman Mwakanyamale</Text>
          {clip.postedAt ? <Text style={styles.when}>· {formatDay(clip.postedAt)}</Text> : null}
        </View>
        <Text style={styles.title} numberOfLines={3}>
          {title}
        </Text>
        {caption ? (
          <Pressable accessibilityRole="button" accessibilityHint={view.more ? t('Show less') : t('Show more')} onPress={() => update({ more: !view.more })}>
            <Text style={styles.caption} numberOfLines={view.more ? 12 : 2}>
              {caption}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {clip.sermon && sermonTitle ? (
        <Tap
          accessibilityRole="button"
          accessibilityLabel={t('Watch the full sermon: {title}', { title: sermonTitle })}
          onPress={() => openSermon(clip.sermon!.start)}
          style={styles.bridge}>
          <View style={styles.bridgeArt}>
            {sermon?.thumbnail ? <Image source={{ uri: sermon.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} /> : null}
            <Icon name="play" size={14} color={WHITE} filled />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={styles.bridgeEyebrow}>
              {clip.sermon.start > 0 ? t('Full sermon · from {time}', { time: clock(clip.sermon.start) }) : t('From the full sermon')}
            </Text>
            <Text style={styles.bridgeTitle} numberOfLines={1}>
              {sermonTitle}
            </Text>
          </View>
          <Icon name="arrow" size={20} color={WHITE} />
        </Tap>
      ) : null}

      <View style={styles.progressTrack} accessible={false}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {view.ended && clip.sermon && sermonTitle ? (
        <GrowSheet
          sermonTitle={sermonTitle}
          thumbnail={sermon?.thumbnail ?? null}
          from={clip.sermon.start}
          saved={saved}
          canSave={!!sermon}
          onWatch={() => openSermon(clip.sermon!.start)}
          onSave={() => sermon && lib.toggleVideo(sermon)}
          onReplay={replay}
          onNext={onNext}
        />
      ) : null}
    </View>
  );
}

/** When a seed ends: grow it into the full sermon, or move on to the next seed. */
function GrowSheet({
  sermonTitle,
  thumbnail,
  from,
  saved,
  canSave,
  onWatch,
  onSave,
  onReplay,
  onNext,
}: {
  sermonTitle: string;
  thumbnail: string | null;
  from: number;
  saved: boolean;
  canSave: boolean;
  onWatch: () => void;
  onSave: () => void;
  onReplay: () => void;
  onNext?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [left, setLeft] = useState(NEXT_IN);
  const [paused, setPaused] = useState(false);

  // Count down to the next seed, unless the viewer is choosing something here.
  useEffect(() => {
    if (!onNext || paused) return;
    if (left <= 0) {
      onNext();
      return;
    }
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, paused, onNext]);

  const ring = 2 * Math.PI * 11;

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.sheetShade}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Watch this seed again')} onPress={onReplay} style={[styles.replay, { top: insets.top + 6 }]}>
        <Icon name="replay" size={16} color={WHITE} />
        <Text style={styles.replayText}>{t('Replay')}</Text>
      </Pressable>
      <View style={styles.sheet} accessibilityViewIsModal onTouchStart={() => setPaused(true)}>
        <View style={styles.handle} />
        <View style={{ gap: 6 }}>
          <Text style={styles.sheetTitle} accessibilityRole="header">
            {t('Grow this seed')}
          </Text>
          <Text style={styles.sheetText}>{t('This seed was edited from a full teaching. Watch the whole message.')}</Text>
        </View>
        <Pop trigger={1}>
          <Tap accessibilityRole="button" accessibilityLabel={t('Watch the full sermon: {title}', { title: sermonTitle })} onPress={onWatch} style={styles.sermonArt}>
            {thumbnail ? <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} /> : <Eagle height={90} light />}
            <View style={styles.sermonPlay}>
              <Icon name="play" size={22} color={WHITE} filled />
            </View>
            {from > 0 ? <Text style={styles.startsAt}>{t('Opens at {time}', { time: clock(from) })}</Text> : null}
          </Tap>
        </Pop>
        <View style={{ gap: 2 }}>
          <Text style={styles.sermonTitle} numberOfLines={2}>
            {sermonTitle}
          </Text>
          <Text style={styles.sermonMeta}>{t('Iman Mwakanyamale · Sermon')}</Text>
        </View>
        <Tap accessibilityRole="button" onPress={onWatch} style={styles.primary}>
          <Icon name="play" size={18} color={WHITE} filled />
          <Text style={styles.primaryText}>{from > 0 ? t('Watch from {time}', { time: clock(from) }) : t('Watch the full sermon')}</Text>
        </Tap>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {onNext ? (
            <Tap accessibilityRole="button" accessibilityLabel={paused ? t('Next seed') : t('Next seed in {n} seconds', { n: left })} onPress={onNext} style={styles.secondary}>
              {paused ? (
                <Icon name="next" size={18} color={TEXT} />
              ) : (
                <Svg width={26} height={26} viewBox="0 0 26 26">
                  <Circle cx={13} cy={13} r={11} fill="none" stroke="#EDE4D8" strokeWidth={2.5} />
                  <Circle
                    cx={13}
                    cy={13}
                    r={11}
                    fill="none"
                    stroke={BROWN}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeDasharray={ring}
                    strokeDashoffset={ring * (1 - left / NEXT_IN)}
                    transform="rotate(-90 13 13)"
                  />
                </Svg>
              )}
              <Text style={styles.secondaryText}>{t('Next seed')}</Text>
            </Tap>
          ) : null}
          {canSave ? (
            <Tap accessibilityRole="button" accessibilityState={{ selected: saved }} onPress={onSave} style={[styles.secondary, styles.secondaryFill]}>
              <Icon name="bookmark" size={18} color={TEXT} filled={saved} />
              <Text style={styles.secondaryText}>{saved ? t('Saved') : t('Watch later')}</Text>
            </Tap>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * The title is the caption's first line, so only show what the caption adds
 * after it (tidied the same way), or nothing.
 */
function captionBeyondTitle(caption: string | null, title: string) {
  if (!caption) return null;
  const core = title.replace(/…$/, '').trim();
  const rest = caption.trim().toLowerCase().startsWith(core.toLowerCase()) ? caption.trim().slice(core.length).replace(/^[\s.,:;!?…-]+/, '') : caption.trim();
  return rest ? seedTitle(rest) : null;
}

/** The player is a native object; its settings are changed in place. */
function applyMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}

function RailButton({ icon, label, text, onPress, on = false, filled = false }: { icon: IconName; label: string; text: string; onPress: () => void; on?: boolean; filled?: boolean }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress} style={styles.railButton}>
      <Pop trigger={on ? 1 : 0}>
        <View style={styles.railIcon}>
          <Icon name={icon} size={24} color={on ? GOLD : WHITE} filled={filled} />
        </View>
      </Pop>
      <Text style={styles.railText}>{text}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, color: SOFT, textAlign: 'center' },
  topBar: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 18, paddingRight: 12 },
  topTitle: { fontFamily: Fonts.display, fontSize: 30, color: WHITE },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'flex-start', paddingTop: '28%', backgroundColor: '#2B1F17', opacity: 0.35 },
  bigPlay: { position: 'absolute', alignSelf: 'center', top: '42%', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(14,11,9,0.55)', alignItems: 'center', justifyContent: 'center' },
  spinner: { position: 'absolute', alignSelf: 'center', top: '47%' },
  shadeLow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '52%', backgroundImage: 'linear-gradient(180deg, rgba(14,11,9,0) 0%, rgba(14,11,9,0.88) 100%)' },
  shadeTop: { position: 'absolute', left: 0, right: 0, top: 0, backgroundImage: 'linear-gradient(180deg, rgba(14,11,9,0.55) 0%, rgba(14,11,9,0) 100%)' },
  rail: { position: 'absolute', right: 10, alignItems: 'center', gap: 16 },
  railButton: { width: 62, alignItems: 'center', gap: 5 },
  railIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  railText: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: WHITE },
  words: { position: 'absolute', left: 18, right: 86, gap: 10 },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: GOLD, backgroundColor: '#17120E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.display, fontSize: 12, color: GOLD },
  name: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: WHITE },
  when: { fontFamily: Fonts.sans, fontSize: 13, color: SOFT },
  title: { fontFamily: Fonts.displayMedium, fontSize: 32, lineHeight: 34, color: WHITE },
  caption: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: SOFT },
  bridge: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 24,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  bridgeArt: { width: 78, height: 46, borderRadius: 10, overflow: 'hidden', backgroundColor: '#2B1F17', alignItems: 'center', justifyContent: 'center' },
  bridgeEyebrow: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: GOLD },
  bridgeTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: WHITE },
  progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  progressFill: { height: 3, backgroundColor: GOLD },
  nudge: { position: 'absolute', left: 14, right: 14, gap: 8, padding: 18, borderRadius: 20, backgroundColor: PAPER },
  nudgeTitle: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 26, color: TEXT },
  nudgeText: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: MUTED },
  nudgePrimary: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'center' },
  nudgePrimaryText: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: WHITE },
  nudgeSecondary: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: '#DCCFBE', alignItems: 'center', justifyContent: 'center' },
  nudgeSecondaryText: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: TEXT },
  sheetShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(8,6,5,0.6)', justifyContent: 'flex-end' },
  replay: { position: 'absolute', right: 66, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)' },
  replayText: { fontFamily: Fonts.sansSemiBold, fontSize: 13, color: WHITE },
  sheet: { backgroundColor: PAPER, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 22, gap: 14 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#DCCFBE' },
  sheetTitle: { fontFamily: Fonts.displayMedium, fontSize: 34, lineHeight: 36, color: TEXT },
  sheetText: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, color: MUTED },
  sermonArt: { height: 176, borderRadius: 18, overflow: 'hidden', backgroundColor: '#2B1F17', alignItems: 'center', justifyContent: 'center' },
  sermonPlay: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(14,11,9,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  startsAt: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(14,11,9,0.8)',
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: GOLD,
  },
  sermonTitle: { fontFamily: Fonts.display, fontSize: 25, lineHeight: 27, color: TEXT },
  sermonMeta: { fontFamily: Fonts.sans, fontSize: 14, color: MUTED },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 54, borderRadius: 16, backgroundColor: BROWN },
  primaryText: { fontFamily: Fonts.sansSemiBold, fontSize: 16, color: WHITE },
  secondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: '#DCCFBE' },
  secondaryFill: { borderWidth: 0, backgroundColor: '#F1E9DE' },
  secondaryText: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: TEXT },
});
