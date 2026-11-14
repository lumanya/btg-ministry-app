import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eagle } from '@/components/art';
import { Icon } from '@/components/icon';
import { Appear } from '@/components/motion';
import { Body, Button, IconButton, Tap, Title } from '@/components/ui';
import { VideoThumb } from '@/components/video-thumb';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { findDevotional, formatDate } from '@/content/sample';
import { videoMeta, videoTone } from '@/lib/video';
import { useLibrary } from '@/state/library';
import { useColors, useStyles } from '@/state/theme';

type Section = 'sermons' | 'devotionals';

/** Everything the member has bookmarked, kept on the phone. */
export default function Saved() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lib = useLibrary();
  const [section, setSection] = useState<Section>(lib.savedVideos.length || !lib.savedDevotionals.length ? 'sermons' : 'devotionals');

  const devotionals = lib.savedDevotionals.map((id) => findDevotional(id)).filter((d): d is NonNullable<typeof d> => !!d);
  const counts = { sermons: lib.savedVideos.length, devotionals: devotionals.length };

  return (
    <View style={{ flex: 1, backgroundColor: c.ivory }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="back" label="Back" variant="plain" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: ScreenPadding, paddingBottom: insets.bottom + 40, gap: 20 }} showsVerticalScrollIndicator={false}>
        <Title size={38}>Saved</Title>

        <View style={styles.segment} accessibilityRole="tablist">
          {(['sermons', 'devotionals'] as Section[]).map((s) => {
            const on = section === s;
            return (
              <Tap
                key={s}
                haptic="tick"
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setSection(s)}
                style={[styles.segmentItem, on && styles.segmentOn]}>
                <Text style={[styles.segmentText, on && { color: c.cream }]}>
                  {s === 'sermons' ? 'Sermons' : 'Devotionals'}
                  {counts[s] ? ` · ${counts[s]}` : ''}
                </Text>
              </Tap>
            );
          })}
        </View>

        {section === 'sermons' ? (
          lib.savedVideos.length ? (
            <View style={{ gap: 14 }}>
              {lib.savedVideos.map((v, i) => (
                <Appear key={v.id} index={i}>
                  <View style={styles.row}>
                    <Tap
                      accessibilityRole="button"
                      accessibilityLabel={`${v.title}, ${videoMeta(v)}`}
                      onPress={() => router.push({ pathname: '/sermon/[id]', params: { id: v.id } })}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <VideoThumb video={v} height={72} titleSize={13} tone={videoTone(i)} radius={12} style={{ width: 124, gap: 8 }} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.itemTitle} numberOfLines={3}>
                          {v.title}
                        </Text>
                        <Text style={styles.meta}>{videoMeta(v)}</Text>
                      </View>
                    </Tap>
                    <IconButton icon="bookmark" filled selected label={`Remove ${v.title} from saved`} variant="plain" onPress={() => lib.toggleVideo(v)} />
                  </View>
                </Appear>
              ))}
            </View>
          ) : (
            <Empty
              title="No saved sermons yet"
              text="Tap Save on any sermon to keep it here for later."
              action="Browse sermons"
              onAction={() => router.navigate('/sermons')}
            />
          )
        ) : devotionals.length ? (
          <View>
            {devotionals.map((d, i) => (
              <Appear key={d.id} index={i}>
                <View style={styles.devRow}>
                  <Tap
                    accessibilityRole="button"
                    accessibilityLabel={`${d.title}, ${formatDate(d.date)}`}
                    onPress={() => router.push({ pathname: '/devotional/[id]', params: { id: d.id } })}
                    style={{ flex: 1, gap: 3, paddingVertical: 14 }}>
                    <Text style={styles.devDate}>{formatDate(d.date)}</Text>
                    <Text style={styles.devTitle}>{d.title}</Text>
                    {lib.isRead(d.id) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon name="check" size={14} color={c.accent} />
                        <Text style={styles.meta}>Read</Text>
                      </View>
                    ) : null}
                  </Tap>
                  <IconButton icon="bookmark" filled selected label={`Remove ${d.title} from saved`} variant="plain" onPress={() => lib.toggleDevotional(d.id)} />
                </View>
              </Appear>
            ))}
          </View>
        ) : (
          <Empty
            title="No saved devotionals yet"
            text="Tap the bookmark while reading a devotional to keep it here."
            action="Today’s devotional"
            onAction={() => router.navigate('/devotional')}
          />
        )}
      </ScrollView>
    </View>
  );
}

function Empty({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  const styles = useStyles(createStyles);
  return (
    <Appear>
      <View style={styles.empty}>
        <View style={styles.emptyArt}>
          <Eagle height={58} light />
        </View>
        <Title size={26} style={{ textAlign: 'center' }}>
          {title}
        </Title>
        <Body style={{ textAlign: 'center' }}>{text}</Body>
        <Button label={action} variant="outline" onPress={onAction} />
      </View>
    </Appear>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    topBar: { paddingHorizontal: 12, paddingBottom: 4 },
    segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: Radius.pill, backgroundColor: c.parchment, borderWidth: 1, borderColor: c.line },
    segmentItem: { flex: 1, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
    segmentOn: { backgroundColor: c.brown },
    segmentText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.brownDark },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    itemTitle: { fontFamily: Fonts.sansSemiBold, fontSize: 15, lineHeight: 20, color: c.text },
    meta: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
    devRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: c.line },
    devDate: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: c.eyebrow },
    devTitle: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 24, color: c.text },
    empty: { alignItems: 'center', gap: 14, paddingVertical: 36, paddingHorizontal: 20, borderRadius: Radius.xl, backgroundColor: c.parchment },
    emptyArt: { width: 84, height: 84, borderRadius: 42, backgroundColor: c.brown, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
  });
