import { useEvent, useEventListener } from 'expo';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, NativeScrollEvent, NativeSyntheticEvent, Pressable, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eagle } from '@/components/art';
import { Icon, IconName } from '@/components/icon';
import { Pop } from '@/components/motion';
import { Tap } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { compact, t } from '@/i18n';
import { Clip, clock } from '@/lib/clips';
import { formatDay } from '@/lib/video';
import { useClips } from '@/state/clips';
import { useDataSaver } from '@/state/data-saver';
import { recordView, toggleLike, useStat } from '@/state/engagement';
import { useFeed } from '@/state/feed';
import { usePlayer } from '@/state/player';

/**
 * Clips: the ministry's short Instagram videos, one per screen, playing on their
 * own as you swipe up. Each can lead to the full sermon it comes from.
 */
const INK = '#120C07';
const CREAM = '#F8EFE0';
const GOLD = '#E6C898';
const BROWN = '#704828';

export default function ClipsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const { start } = useLocalSearchParams<{ start?: string }>();
  const { clips, status, refresh } = useClips();
  const podcast = usePlayer();
  const saving = useDataSaver().active;
  const list = useRef<FlatList<Clip>>(null);

  const startIndex = Math.max(0, clips.findIndex((c) => c.id === start));
  const [active, setActive] = useState(startIndex);
  const [focused, setFocused] = useState(true);
  const [muted, setMuted] = useState(false);

  // Fresh video links when the feed opens (Instagram's expire after a while).
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Pause when another screen covers this one; stop the podcast so they don't overlap.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      if (podcast.playing) podcast.toggle();
      return () => setFocused(false);
      // Only on focus changes, not on every podcast update.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActive(Math.round(e.nativeEvent.contentOffset.y / height));
  };
  const goTo = (index: number) => {
    if (index < 0 || index >= clips.length) return;
    list.current?.scrollToIndex({ index, animated: true });
    setActive(index);
  };
  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <View style={{ flex: 1, backgroundColor: INK }}>
      <StatusBar style="light" />
      {clips.length ? (
        <FlatList
          ref={list}
          data={clips}
          keyExtractor={(c) => c.id}
          renderItem={({ item, index }) => (
            <ClipPage
              clip={item}
              width={width}
              height={height}
              active={focused && index === active}
              activeKey={`${index}:${active}:${focused}`}
              load={index === active || (!saving && Math.abs(index - active) === 1)}
              muted={muted}
              bottomInset={insets.bottom}
              onNext={index < clips.length - 1 ? () => goTo(index + 1) : undefined}
            />
          )}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onMomentumScrollEnd={onScrollEnd}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
        />
      ) : (
        <View style={styles.empty}>
          {status === 'loading' ? (
            <ActivityIndicator color={CREAM} accessibilityLabel={t('Loading clips')} />
          ) : (
            <Text style={styles.emptyText}>{status === 'error' ? t('Couldn’t load clips. Check your connection and try again.') : t('No clips yet. New ones appear here when the ministry posts them.')}</Text>
          )}
        </View>
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]} pointerEvents="box-none">
        <RoundButton icon="back" label={t('Back')} onPress={back} />
        <Text style={styles.topTitle} accessibilityRole="header">
          {t('Clips')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={muted ? t('Turn sound on') : t('Mute')}
          accessibilityState={{ selected: muted }}
          onPress={() => setMuted((m) => !m)}
          style={styles.round}>
          <SoundIcon muted={muted} />
        </Pressable>
      </View>
    </View>
  );
}

function ClipPage({
  clip,
  width,
  height,
  active,
  activeKey,
  load,
  muted,
  bottomInset,
  onNext,
}: {
  clip: Clip;
  width: number;
  height: number;
  active: boolean;
  /** Changes whenever this clip becomes current again, so paused/ended reset. */
  activeKey: string;
  load: boolean;
  muted: boolean;
  bottomInset: number;
  onNext?: () => void;
}) {
  const router = useRouter();
  const { findVideo } = useFeed();
  const stat = useStat('clip', clip.id);
  const [local, setLocal] = useState({ key: activeKey, paused: false, ended: false, more: false });
  const view = local.key === activeKey ? local : { key: activeKey, paused: false, ended: false, more: false };
  const update = (patch: Partial<typeof view>) => setLocal({ ...view, ...patch });

  const player = useVideoPlayer(load && clip.videoUrl ? { uri: clip.videoUrl } : null, (p) => {
    // Clips that lead to a sermon stop at the end and offer it; others loop.
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

  // Count a view once it has played for two seconds.
  const watched = active && currentTime > 2;
  useEffect(() => {
    if (watched) recordView('clip', clip.id);
  }, [watched, clip.id]);

  const duration = player.duration || 0;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const started = status === 'readyToPlay' && currentTime > 0.05;
  const sermonTitle = clip.sermon ? (findVideo(clip.sermon.youtubeId)?.title ?? clip.title) : null;
  const liked = !!stat?.liked;

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
            <Eagle height={260} light />
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
            <Icon name="play" size={34} color={CREAM} filled />
          </View>
        ) : null}
        {active && load && status === 'loading' ? <ActivityIndicator color={CREAM} style={styles.spinner} /> : null}
      </Pressable>

      <View style={[styles.rail, { bottom: bottomInset + (clip.sermon ? 190 : 130) }]}>
        <RailButton
          icon="heart"
          filled={liked}
          on={liked}
          label={liked ? t('Remove your like') : t('Like this clip')}
          text={stat?.likes ? compact(stat.likes) : t('Like')}
          onPress={() => toggleLike('clip', clip.id)}
        />
        <RailButton
          icon="share"
          label={t('Share this clip')}
          text={t('Share')}
          onPress={() => Share.share({ message: `${clip.title} — BTG Ministry${clip.permalink ? ` ${clip.permalink}` : ''}` })}
        />
      </View>

      <View style={[styles.bottom, { paddingBottom: bottomInset + 18 }]} pointerEvents="box-none">
        <View style={styles.byline}>
          <View style={styles.avatar}>
            <Eagle height={26} />
          </View>
          <View>
            <Text style={styles.name}>BTG Ministry</Text>
            {clip.postedAt ? <Text style={styles.when}>{formatDay(clip.postedAt)}</Text> : null}
          </View>
        </View>
        {clip.caption ? (
          <Pressable accessibilityRole="button" accessibilityHint={view.more ? t('Show less') : t('Show more')} onPress={() => update({ more: !view.more })}>
            <Text style={styles.caption} numberOfLines={view.more ? 12 : 2}>
              {clip.caption}
            </Text>
          </Pressable>
        ) : null}
        {clip.sermon && sermonTitle ? (
          <Tap accessibilityRole="button" accessibilityLabel={t('Watch the full sermon: {title}', { title: sermonTitle })} onPress={() => openSermon(clip.sermon!.start)} style={styles.sermonCard}>
            <View style={styles.sermonArt}>
              <Eagle height={34} light />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.sermonEyebrow}>{t('From the sermon')}</Text>
              <Text style={styles.sermonTitle} numberOfLines={1}>
                {sermonTitle}
              </Text>
            </View>
            <View style={styles.watchPill}>
              <Text style={styles.watchText}>{t('Watch')}</Text>
              <Icon name="chevron" size={14} color="#4F3119" />
            </View>
          </Tap>
        ) : null}
      </View>

      <View style={[styles.progressTrack, { bottom: bottomInset }]} accessible={false}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {view.ended && clip.sermon && sermonTitle ? (
        <View style={styles.sheetShade}>
          <View style={[styles.sheet, { paddingBottom: bottomInset + 24 }]} accessibilityViewIsModal>
            <View style={styles.handle} />
            <View style={{ gap: 4 }}>
              <Text style={styles.sheetEyebrow}>{t('Keep watching')}</Text>
              <Text style={styles.sheetTitle} accessibilityRole="header">
                {t('Want the whole message?')}
              </Text>
            </View>
            <View style={styles.sheetSermon}>
              <View style={[styles.sermonArt, { width: 64, height: 64 }]}>
                <Eagle height={44} light />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.sheetSermonTitle}>{sermonTitle}</Text>
                <Text style={styles.sheetMeta}>{t('This clip starts at {time} in the sermon.', { time: clock(clip.sermon.start) })}</Text>
              </View>
            </View>
            <Pop trigger={view.ended ? 1 : 0}>
              <Tap accessibilityRole="button" onPress={() => openSermon(clip.sermon!.start + duration)} style={styles.primary}>
                <Icon name="play" size={18} color={CREAM} filled />
                <Text style={styles.primaryText}>{t('Continue from this moment')}</Text>
              </Tap>
            </Pop>
            <Tap accessibilityRole="button" onPress={() => openSermon(0)} style={styles.secondary}>
              <Text style={styles.secondaryText}>{t('Watch from the start')}</Text>
            </Tap>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 28 }}>
              <Tap accessibilityRole="button" onPress={replay} style={styles.textButton}>
                <Text style={styles.textButtonText}>{t('Replay clip')}</Text>
              </Tap>
              {onNext ? (
                <Tap accessibilityRole="button" onPress={onNext} style={styles.textButton}>
                  <Text style={styles.textButtonText}>{t('Next clip')}</Text>
                </Tap>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The player is a native object; its settings are changed in place. */
function applyMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}

function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.round} hitSlop={6}>
      <Icon name={icon} size={24} color={CREAM} />
    </Pressable>
  );
}

function RailButton({ icon, label, text, onPress, on = false, filled = false }: { icon: IconName; label: string; text: string; onPress: () => void; on?: boolean; filled?: boolean }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={onPress} style={styles.railButton}>
      <Pop trigger={on ? 1 : 0}>
        <View style={[styles.railIcon, on && { backgroundColor: GOLD }]}>
          <Icon name={icon} size={24} color={on ? BROWN : CREAM} filled={filled} />
        </View>
      </Pop>
      <Text style={styles.railText}>{text}</Text>
    </Tap>
  );
}

function SoundIcon({ muted }: { muted: boolean }) {
  return <Icon name={muted ? 'volumeOff' : 'volume'} size={22} color={CREAM} />;
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, color: CREAM, textAlign: 'center' },
  topBar: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  topTitle: { fontFamily: Fonts.display, fontSize: 24, color: CREAM, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(18, 12, 7, 0.35)' },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3A2413', opacity: 0.9 },
  bigPlay: { position: 'absolute', alignSelf: 'center', top: '42%', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(18, 12, 7, 0.55)', alignItems: 'center', justifyContent: 'center' },
  spinner: { position: 'absolute', alignSelf: 'center', top: '47%' },
  rail: { position: 'absolute', right: 10, alignItems: 'center', gap: 18 },
  railButton: { width: 60, alignItems: 'center', gap: 4 },
  railIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(18, 12, 7, 0.45)' },
  railText: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: CREAM, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 60, gap: 12, backgroundColor: 'rgba(18, 12, 7, 0.38)' },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 76 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: CREAM, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2, overflow: 'hidden' },
  name: { fontFamily: Fonts.sansBold, fontSize: 15, color: CREAM },
  when: { fontFamily: Fonts.sans, fontSize: 12, color: '#D9C6AC' },
  caption: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: '#EFE3D2', paddingRight: 76 },
  sermonCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 16, backgroundColor: 'rgba(248, 239, 224, 0.14)', borderWidth: 1, borderColor: 'rgba(248, 239, 224, 0.28)' },
  sermonArt: { width: 44, height: 44, borderRadius: 10, backgroundColor: BROWN, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  sermonEyebrow: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: GOLD },
  sermonTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: CREAM },
  watchPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: CREAM },
  watchText: { fontFamily: Fonts.sansBold, fontSize: 13, color: '#4F3119' },
  progressTrack: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: 'rgba(248, 239, 224, 0.2)' },
  progressFill: { height: 3, backgroundColor: GOLD },
  sheetShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(18, 12, 7, 0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FCFAF6', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, gap: 16 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#E2D5C2' },
  sheetEyebrow: { fontFamily: Fonts.sansBold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: '#7A4E26' },
  sheetTitle: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 32, color: '#1F130A' },
  sheetSermon: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sheetSermonTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 16, color: '#1F130A' },
  sheetMeta: { fontFamily: Fonts.sans, fontSize: 13, color: '#5C4634' },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 999, backgroundColor: BROWN },
  primaryText: { fontFamily: Fonts.sansSemiBold, fontSize: 16, color: CREAM },
  secondary: { alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 999, borderWidth: 1, borderColor: BROWN },
  secondaryText: { fontFamily: Fonts.sansSemiBold, fontSize: 16, color: '#4F3119' },
  textButton: { minHeight: 44, justifyContent: 'center' },
  textButtonText: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: BROWN },
});
