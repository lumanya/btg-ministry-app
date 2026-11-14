import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eagle } from '@/components/art';
import { Icon, IconName } from '@/components/icon';
import { Body, Eyebrow, IconButton, Tap, Title } from '@/components/ui';
import { VideoThumb } from '@/components/video-thumb';
import { YouTubePlayer } from '@/components/youtube-player';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { links } from '@/content/sample';
import { findVideo, videoMeta, videoTone, youtubeWatchUrl } from '@/lib/video';
import { useFeed } from '@/state/feed';
import { useLibrary } from '@/state/library';
import { useColors, useStyles } from '@/state/theme';

export default function SermonScreen() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { feed } = useFeed();
  const video = findVideo(feed, id) ?? feed.videos[0];

  // Reset the player state when moving to another sermon.
  const [state, setState] = useState({ id, playing: false, more: false });
  const current = state.id === id ? state : { id, playing: false, more: false };
  const lib = useLibrary();
  const update = (patch: Partial<typeof current>) => setState({ ...current, ...patch });

  if (!video) {
    return (
      <View style={[styles.missing, { paddingTop: insets.top + 60 }]}>
        <Title size={28}>This sermon isn’t available.</Title>
        <Tap accessibilityRole="button" onPress={() => router.replace('/sermons')}>
          <Text style={styles.link}>Back to sermons</Text>
        </Tap>
      </View>
    );
  }

  const watchUrl = youtubeWatchUrl(video) ?? links.youtubeChannel;
  const playerHeight = Math.round(Math.min(width, 700) * (9 / 16));
  const play = () => (video.youtubeId ? update({ playing: true }) : WebBrowser.openBrowserAsync(links.youtubeChannel));
  const upNext = feed.videos.filter((v) => v.id !== video.id).slice(0, 3);
  const longDescription = video.description.length > 220;

  const actions: { icon: IconName; label: string; onPress: () => void; on?: boolean }[] = [
    { icon: 'bookmark', label: lib.isVideoSaved(video.id) ? 'Saved' : 'Save', onPress: () => lib.toggleVideo(video), on: lib.isVideoSaved(video.id) },
    { icon: 'share', label: 'Share', onPress: () => Share.share({ message: `${video.title} — BTG Ministry ${watchUrl}` }) },
    { icon: 'sermons', label: 'YouTube', onPress: () => WebBrowser.openBrowserAsync(watchUrl) },
    { icon: 'heart', label: 'Give', onPress: () => router.push('/give') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.ivory }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="back" label="Back" variant="plain" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/sermons'))} />
        <Eyebrow style={{ fontSize: 13 }}>{video.kind === 'stream' || video.kind === 'live' ? 'Livestream' : 'Sermon'}</Eyebrow>
        <View style={{ width: 44 }} />
      </View>

      {current.playing && video.youtubeId ? (
        <YouTubePlayer youtubeId={video.youtubeId} style={{ height: playerHeight }} />
      ) : (
        <Tap accessibilityRole="button" accessibilityLabel={`Play ${video.title}`} onPress={play}>
          <VideoThumb video={video} height={playerHeight} titleSize={28} radius={0} play="center" style={{ backgroundColor: c.night }} />
        </Tap>
      )}

      <ScrollView contentContainerStyle={{ padding: ScreenPadding, paddingBottom: insets.bottom + 32, gap: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 8 }}>
          <Title size={30}>{video.title}</Title>
          <Text style={styles.meta}>
            {videoMeta(video)}
            {video.duration ? ` · ${video.duration}` : ''}
          </Text>
          {!video.youtubeId ? <Text style={styles.meta}>This is sample content; the video isn’t on YouTube yet.</Text> : null}
        </View>

        <View style={styles.speaker}>
          <View style={styles.avatar}>
            <Eagle height={34} />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={styles.speakerName}>Iman Mwakanyamale</Text>
            <Text style={styles.meta}>General Overseer</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {actions.map((a) => (
            <Tap
              key={a.label}
              accessibilityRole="button"
              accessibilityState={a.on === undefined ? undefined : { selected: a.on }}
              onPress={a.onPress}
              style={[styles.action, a.on && { backgroundColor: c.brown, borderColor: c.brown }]}>
              <Icon name={a.icon} size={20} color={a.on ? c.cream : c.brownDark} filled={a.on} />
              <Text style={[styles.actionText, a.on && { color: c.cream }]}>{a.label}</Text>
            </Tap>
          ))}
        </View>

        {video.description ? (
          <View style={{ gap: 6 }}>
            <Body>{longDescription && !current.more ? `${video.description.slice(0, 220).trimEnd()}…` : video.description}</Body>
            {longDescription ? (
              <Tap accessibilityRole="button" onPress={() => update({ more: !current.more })} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
                <Text style={styles.link}>{current.more ? 'Show less' : 'Show more'}</Text>
              </Tap>
            ) : null}
          </View>
        ) : null}

        {upNext.length ? (
          <View style={{ gap: 14 }}>
            <Eyebrow>Up next</Eyebrow>
            {upNext.map((v, i) => (
              <Tap
                key={v.id}
                accessibilityRole="button"
                accessibilityLabel={`${v.title}, ${videoMeta(v)}`}
                onPress={() => router.replace({ pathname: '/sermon/[id]', params: { id: v.id } })}
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
  },
  actionText: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: c.brownDark },
});
