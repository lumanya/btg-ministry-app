import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Arch } from '@/components/art';
import { Icon } from '@/components/icon';
import { Appear, Skeleton } from '@/components/motion';
import { Body, Button, Eyebrow, IconButton, Tap, Title } from '@/components/ui';
import { VideoThumb } from '@/components/video-thumb';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import type { FeedPlaylist, FeedVideo } from '@/lib/video';
import { videoMeta, videoTone } from '@/lib/video';
import { useFeed } from '@/state/feed';
import { useColors, useStyles } from '@/state/theme';

/** One series of teachings, in the order arranged on YouTube. */
export default function PlaylistScreen() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { playlists, loadPlaylist } = useFeed();
  const known = playlists.find((p) => p.id === id);

  const [info, setInfo] = useState<FeedPlaylist | null>(known ?? null);
  const [videos, setVideos] = useState<FeedVideo[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const first = useCallback(async () => {
    setError(false);
    try {
      const page = await loadPlaylist(id);
      setInfo((i) => (i ? { ...i, count: page.playlist?.count ?? i.count } : page.playlist));
      setVideos(page.videos);
      setNext(page.nextPageToken);
    } catch {
      setError(true);
    }
  }, [id, loadPlaylist]);

  useEffect(() => {
    const t = setTimeout(first, 0);
    return () => clearTimeout(t);
  }, [first]);

  const more = async () => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await loadPlaylist(id, next);
      setVideos((v) => [...(v ?? []), ...page.videos]);
      setNext(page.nextPageToken);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const open = (v: FeedVideo) => router.push({ pathname: '/sermon/[id]', params: { id: v.id, playlist: id } });
  const title = info?.title ?? 'Series';

  const header = (
    <View style={{ gap: 18, paddingBottom: 8 }}>
      <View style={styles.hero}>
        {info?.thumbnail ? (
          <Image source={{ uri: info.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.artBrown }]}>
            <Arch tone="brown" width={90} height={140} eagleHeight={80} />
          </View>
        )}
      </View>
      <View style={{ gap: 6 }}>
        <Eyebrow>Series · {info ? `${info.count} teachings` : 'Teachings'}</Eyebrow>
        <Title size={34}>{title}</Title>
        {info?.description ? <Body>{info.description.split('\n')[0]}</Body> : null}
      </View>
      {videos?.length ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Start from part 1" icon="play" onPress={() => open(videos[0])} style={{ flex: 1 }} />
          <IconButton
            icon="share"
            label={`Share the ${title} series`}
            size={52}
            onPress={() => Share.share({ message: `${title} — a teaching series from BTG Ministry. https://www.youtube.com/playlist?list=${id}` })}
          />
        </View>
      ) : null}
      {error ? (
        <Tap accessibilityRole="button" onPress={first} style={styles.notice}>
          <Text style={styles.meta}>Couldn’t load this series. Tap to try again.</Text>
        </Tap>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.ivory }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="back" label="Back" variant="plain" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/sermons'))} />
      </View>
      <FlatList
        data={videos ?? []}
        keyExtractor={(v) => v.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: ScreenPadding, paddingBottom: insets.bottom + 32, gap: 14 }}
        onEndReached={more}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          videos === null && !error ? (
            <View style={{ gap: 14 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.row}>
                  <Skeleton height={72} width={124} radius={12} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Skeleton height={14} width="85%" />
                    <Skeleton height={12} width="45%" />
                  </View>
                </View>
              ))}
            </View>
          ) : videos?.length === 0 ? (
            <Text style={styles.meta}>No teachings in this series yet.</Text>
          ) : undefined
        }
        ListFooterComponent={
          next ? (
            <Button label={loadingMore ? 'Loading…' : 'Load more'} variant="outline" onPress={more} style={{ marginTop: 8 }} />
          ) : undefined
        }
        renderItem={({ item: v, index: i }) => (
          <Appear index={Math.min(i, 8)}>
            <Tap
              accessibilityRole="button"
              accessibilityLabel={`Part ${i + 1}: ${v.title}, ${videoMeta(v)}`}
              onPress={() => open(v)}
              style={styles.row}>
              <View>
                <VideoThumb video={v} height={72} titleSize={13} tone={videoTone(i)} radius={12} style={{ width: 124 }} />
                <View style={styles.part}>
                  <Text style={styles.partText}>{i + 1}</Text>
                </View>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.itemTitle} numberOfLines={3}>
                  {v.title}
                </Text>
                <Text style={styles.meta}>
                  {videoMeta(v)}
                  {v.duration ? ` · ${v.duration}` : ''}
                </Text>
              </View>
              <Icon name="chevron" size={18} color={c.accent} />
            </Tap>
          </Appear>
        )}
      />
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    topBar: { paddingHorizontal: 12, paddingBottom: 4 },
    hero: { height: 190, borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: c.artDeep },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    part: {
      position: 'absolute',
      left: 6,
      top: 6,
      minWidth: 24,
      height: 24,
      paddingHorizontal: 6,
      borderRadius: 12,
      backgroundColor: c.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    partText: { fontFamily: Fonts.sansBold, fontSize: 12, color: c.brownDark },
    itemTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, lineHeight: 20, color: c.text },
    meta: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
    notice: { padding: 14, borderRadius: Radius.md, backgroundColor: c.parchment },
  });
