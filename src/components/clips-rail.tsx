import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Eagle } from '@/components/art';
import { Icon } from '@/components/icon';
import { SectionHeader, Tap } from '@/components/ui';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { t } from '@/i18n';
import { isNewClip } from '@/lib/clips';
import { useClips } from '@/state/clips';
import { useColors, useStyles } from '@/state/theme';

const TONES = ['#3A2413', '#704828', '#2A1A0F', '#5A3A20'];

/** Home's row of short videos. Tapping one opens the full-screen feed at that clip. */
export function ClipsRail() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const { clips } = useClips();
  if (!clips.length) return null;
  const shown = clips.slice(0, 12);
  const open = (id?: string) => router.push(id ? { pathname: '/clips', params: { start: id } } : '/clips');

  return (
    <View style={{ gap: 12 }}>
      <SectionHeader title={t('Clips')} action={t('Watch all')} onAction={() => open()} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -ScreenPadding }}
        contentContainerStyle={{ paddingHorizontal: ScreenPadding, gap: 10 }}>
        {shown.map((clip, i) => (
          <Tap
            key={clip.id}
            haptic="tap"
            accessibilityRole="button"
            accessibilityLabel={t('Play clip: {title}', { title: clip.title })}
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
            <View style={styles.top}>
              <View style={styles.play}>
                <Icon name="play" size={12} color={c.brownDark} filled />
              </View>
              {isNewClip(clip) ? <Text style={styles.new}>{t('NEW')}</Text> : null}
            </View>
            <Text style={styles.title} numberOfLines={3}>
              {clip.title}
            </Text>
          </Tap>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    tile: { width: 118, height: 210, borderRadius: Radius.md, overflow: 'hidden', padding: 10, justifyContent: 'space-between' },
    art: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: 0.25 },
    shade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(18, 12, 7, 0.28)' },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    play: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(248, 239, 224, 0.92)', alignItems: 'center', justifyContent: 'center' },
    new: { overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: c.gold, color: '#3A2413', fontFamily: Fonts.sansBold, fontSize: 10, letterSpacing: 0.8 },
    title: { fontFamily: Fonts.display, fontSize: 17, lineHeight: 18, color: '#F8EFE0', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  });
