import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Eagle } from '@/components/art';
import { Icon } from '@/components/icon';
import { SectionHeader, Tap } from '@/components/ui';
import { Fonts, ScreenPadding } from '@/constants/theme';
import { t } from '@/i18n';
import { isNewClip, seedTitle } from '@/lib/clips';
import { useClips } from '@/state/clips';

const TONES = ['#2B1F17', '#3B2A1D', '#1F1A17', '#4A3322'];
/** Close to a phone video's shape, and about as tall as the event posters below. */
const TILE_W = 176;
const TILE_H = 300;

/** Today's row of seeds: tall cards that open the Seeds tab at that seed. */
export function SeedsRail() {
  const router = useRouter();
  const { clips } = useClips();
  if (!clips.length) return null;
  const shown = clips.slice(0, 12);
  const open = (id?: string) => router.navigate(id ? { pathname: '/seeds', params: { start: id, at: String(Date.now()) } } : '/seeds');

  return (
    <View style={{ gap: 14 }}>
      <SectionHeader title={t('Seeds')} subtitle={t('One-minute words from Iman')} action={t('Watch all')} onAction={() => open()} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={TILE_W + 10}
        style={{ marginHorizontal: -ScreenPadding }}
        contentContainerStyle={{ paddingHorizontal: ScreenPadding, gap: 10 }}>
        {shown.map((clip, i) => {
          const title = seedTitle(clip.title);
          return (
            <Tap
              key={clip.id}
              haptic="tap"
              accessibilityRole="button"
              accessibilityLabel={t('Play seed: {title}', { title })}
              onPress={() => open(clip.id)}
              style={[styles.tile, { backgroundColor: TONES[i % TONES.length] }]}>
              {clip.thumbnail ? (
                <Image source={{ uri: clip.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessible={false} />
              ) : (
                <View style={styles.art}>
                  <Eagle height={110} light />
                </View>
              )}
              <View style={styles.shade} />
              <View style={styles.play} accessible={false}>
                <Icon name="play" size={13} color="#FFFFFF" filled />
              </View>
              {isNewClip(clip) ? <Text style={styles.new}>{t('NEW')}</Text> : <View />}
              <Text style={styles.title} numberOfLines={4}>
                {title}
              </Text>
            </Tap>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: TILE_W, height: TILE_H, borderRadius: 20, overflow: 'hidden', padding: 12, justifyContent: 'space-between' },
  art: { position: 'absolute', top: 34, left: 0, right: 0, alignItems: 'center', opacity: 0.22 },
  shade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: 'linear-gradient(180deg, rgba(14,11,9,0.05) 35%, rgba(14,11,9,0.82) 100%)',
  },
  new: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#D4AF73',
    color: '#17120E',
    fontFamily: Fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  title: { fontFamily: Fonts.sansSemiBold, fontSize: 15, lineHeight: 19, color: '#FFFFFF' },
  play: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(14,11,9,0.45)', alignItems: 'center', justifyContent: 'center' },
});
