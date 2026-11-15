import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { compact, t } from '@/i18n';
import { Eagle } from '@/components/art';
import { Icon, IconName } from '@/components/icon';
import { Body, Eyebrow, IconButton, Tap, Title } from '@/components/ui';
import { VideoThumb } from '@/components/video-thumb';
import { YouTubePlayer } from '@/components/youtube-player';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { links } from '@/content/sample';
import { FeedVideo, videoMeta, videoTone, youtubeWatchUrl } from '@/lib/video';
import { recordView, toggleLike, useStat } from '@/state/engagement';
import { useFeed } from '@/state/feed';
import { useLibrary } from '@/state/library';
import { useColors, useStyles } from '@/state/theme';

function olderSermon(youtubeId: string, title: string): FeedVideo {
  return { id: youtubeId, youtubeId, title, description: '', date: '', thumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`, duration: null, kind: 'video', scheduledStart: null };
}

export default function SermonScreen() {
  const c = useColors();
  const styles = useStyles(createStyles);
  // `start` (seconds) and `title` come from a clip: open its full sermon at that moment.
  const { id, playlist, start, title } = useLocalSearchParams<{ id: string; playlist?: string; start?: string; title?: string }>();
  const startAt = Math.max(0, Number(start) || 0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { feed, findVideo, playlistVideos } = useFeed();
  const lib = useLibrary();
  const video =
    findVideo(id) ??
    lib.savedVideos.find((v) => v.id === id) ??
    // An older sermon that isn't in the latest feed (linked from a clip).
    (title && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? olderSermon(id, title) : undefined) ??
    feed.videos[0];
  const stat = useStat('video', video?.youtubeId ? video.id : undefined);
  useEffect(() => {
    if (video?.youtubeId) recordView('video', video.id);
  }, [video?.id, video?.youtubeId]);

  // Reset the player state when moving to another sermon.
  // Opened from a clip at a given moment: start playing straight away.
  const [state, setState] = useState({ id, playing: startAt > 0, more: false });
  const current = state.id === id ? state : { id, playing: startAt > 0, more: false };
  const update = (patch: Partial<typeof current>) => setState({ ...current, ...patch });

  if (!video) {
    return (
      <View style={[styles.missing, { paddingTop: insets.top + 60 }]}>
        <Title size={28}>{t('This sermon isn’t available.')}</Title>
        <Tap accessibilityRole="button" onPress={() => router.replace('/sermons')}>
          <Text style={styles.link}>{t('Back to sermons')}</Text>
        </Tap>
      </View>
    );
  }

  const watchUrl = youtubeWatchUrl(video) ?? links.youtubeChannel;
  const playerHeight = Math.round(Math.min(width, 700) * (9 / 16));
  const play = () => (video.youtubeId ? update({ playing: true }) : WebBrowser.openBrowserAsync(links.youtubeChannel));
  // From a playlist: the next teachings in its order. Otherwise: the latest sermons.
  const series = playlist ? playlistVideos(playlist) : [];
  const at = series.findIndex((v) => v.id === video.id);
  const upNext = at >= 0 ? series.slice(at + 1, at + 4) : feed.videos.filter((v) => v.id !== video.id).slice(0, 3);
  const longDescription = video.description.length > 220;

  const liked = !!stat?.liked;
  const likes = stat?.likes ?? 0;
  const actions: { icon: IconName; label: string; onPress: () => void; on?: boolean; a11y?: string }[] = [
    {
      icon: 'heart',
      label: likes ? compact(likes) : t('Like'),
      a11y: `${liked ? t('Remove your like') : t('Like this sermon')}, ${likes === 1 ? t('1 like') : t('{n} likes', { n: likes })}`,
      onPress: () => (video.youtubeId ? toggleLike('video', video.id) : undefined),
      on: liked,
    },
    { icon: 'bookmark', label: lib.isVideoSaved(video.id) ? t('Saved') : t('Save'), onPress: () => lib.toggleVideo(video), on: lib.isVideoSaved(video.id) },
    { icon: 'share', label: t('Share'), onPress: () => Share.share({ message: `${video.title} — BTG Ministry ${watchUrl}` }) },
    { icon: 'sermons', label: 'YouTube', onPress: () => WebBrowser.openBrowserAsync(watchUrl) },
    { icon: 'gift', label: t('Give'), onPress: () => router.push('/give') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.ivory }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="back" label={t('Back')} variant="plain" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/sermons'))} />
        <Eyebrow style={{ fontSize: 13 }}>{video.kind === 'stream' || video.kind === 'live' ? t('Livestream') : t('Sermon')}</Eyebrow>
        <View style={{ width: 44 }} />
      </View>

      {current.playing && video.youtubeId ? (
        <YouTubePlayer youtubeId={video.youtubeId} start={startAt} style={{ height: playerHeight }} />
      ) : (
        <Tap accessibilityRole="button" accessibilityLabel={t('Play {title}', { title: video.title })} onPress={play}>
          <VideoThumb video={video} height={playerHeight} titleSize={28} radius={0} play="center" style={{ backgroundColor: c.night }} />
        </Tap>
      )}

      <ScrollView contentContainerStyle={{ padding: ScreenPadding, paddingBottom: insets.bottom + 32, gap: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 8 }}>
          <Title size={30}>{video.title}</Title>
          {video.subtitle ? <Text style={styles.subtitle}>{video.subtitle}</Text> : null}
          <Text style={styles.meta}>
            {videoMeta(video)}
            {video.duration ? ` · ${video.duration}` : ''}
          </Text>
          {!video.youtubeId ? <Text style={styles.meta}>{t('This is sample content; the video isn’t on YouTube yet.')}</Text> : null}
        </View>

        <View style={styles.speaker}>
          <View style={styles.avatar}>
            <Eagle height={34} />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={styles.speakerName}>Iman Mwakanyamale</Text>
            <Text style={styles.meta}>{t('General Overseer')}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {actions.map((a) => (
            <Tap
              key={a.icon}
              accessibilityRole="button"
              accessibilityLabel={a.a11y}
              accessibilityState={a.on === undefined ? undefined : { selected: a.on }}
              onPress={a.onPress}
              style={[styles.action, a.on && { backgroundColor: c.brown, borderColor: c.brown }]}>
              <Icon name={a.icon} size={20} color={a.on ? c.cream : c.brownDark} filled={a.on} />
              <Text style={[styles.actionText, a.on && { color: c.cream }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {a.label}
              </Text>
            </Tap>
          ))}
        </View>

        {video.description ? (
          <View style={{ gap: 6 }}>
            <Body>{longDescription && !current.more ? `${video.description.slice(0, 220).trimEnd()}…` : video.description}</Body>
            {longDescription ? (
              <Tap accessibilityRole="button" onPress={() => update({ more: !current.more })} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
                <Text style={styles.link}>{current.more ? t('Show less') : t('Show more')}</Text>
              </Tap>
            ) : null}
          </View>
        ) : null}

        {upNext.length ? (
          <View style={{ gap: 14 }}>
            <Eyebrow>{at >= 0 ? t('Next in this series') : t('Up next')}</Eyebrow>
            {upNext.map((v, i) => (
              <Tap
                key={v.id}
                accessibilityRole="button"
                accessibilityLabel={`${v.title}, ${videoMeta(v)}`}
                onPress={() => router.replace({ pathname: '/sermon/[id]', params: at >= 0 && playlist ? { id: v.id, playlist } : { id: v.id } })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <VideoThumb video={v} height={72} titleSize={13} tone={videoTone(i + 1)} radius={12} style={{ width: 124, gap: 8 }} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.speakerName} numberOfLines={3}>{v.title}</Text>
                  <Text style={styles.meta}>{videoMeta(v)}</Text>
                </View>
              </Tap>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  missing: { flex: 1, backgroundColor: c.ivory, paddingHorizontal: ScreenPadding, gap: 16 },
  link: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: c.accent },
  meta: { fontFamily: Fonts.sans, fontSize: 14, color: c.textMuted },
  subtitle: { fontFamily: Fonts.displayItalic, fontSize: 20, lineHeight: 24, color: c.textMuted },
  speaker: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: c.parchment },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.sand,
    borderWidth: 1,
    borderColor: c.lineStrong,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 3,
    overflow: 'hidden',
  },
  speakerName: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: c.text },
  action: {
    flex: 1,
    height: 68,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  actionText: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: c.brownDark },
});
