import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Pop } from '@/components/motion';
import { Tap } from '@/components/ui';
import { Fonts, Palette, Radius } from '@/constants/theme';
import { compact, t } from '@/i18n';
import { StatKind, toggleLike, useStat } from '@/state/engagement';
import { useColors, useStyles } from '@/state/theme';

/** A heart with the number of likes. Tapping likes or unlikes. */
export function LikeButton({ kind, id, label, style }: { kind: StatKind; id: string; label: string; style?: object }) {
  const c = useColors();
  const styles = useStyles(createStyles);
  const stat = useStat(kind, id);
  const liked = !!stat?.liked;
  const likes = stat?.likes ?? 0;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={liked ? t('Remove your like') : label}
      accessibilityState={{ selected: liked }}
      accessibilityValue={{ text: likes === 1 ? t('1 like') : t('{n} likes', { n: likes }) }}
      onPress={() => toggleLike(kind, id)}
      style={[styles.button, liked && { backgroundColor: c.brown, borderColor: c.brown }, style]}>
      <Pop trigger={liked ? 1 : 0}>
        <Icon name="heart" size={20} color={liked ? c.cream : c.brownDark} filled={liked} />
      </Pop>
      <Text style={[styles.text, liked && { color: c.cream }]}>{likes > 0 ? compact(likes) : t('Like')}</Text>
    </Tap>
  );
}

/** "♡ 12 · 340 reads": counts shown under a devotional or in lists. */
export function StatLine({ likes, views, viewWord }: { likes: number; views: number; viewWord: 'reads' | 'views' }) {
  const c = useColors();
  const styles = useStyles(createStyles);
  if (!likes && !views) return null;
  const viewText = viewWord === 'reads' ? (views === 1 ? t('1 read') : t('{n} reads', { n: compact(views) })) : views === 1 ? t('1 view') : t('{n} views', { n: compact(views) });
  return (
    <View style={styles.line}>
      {likes ? (
        <>
          <Icon name="heart" size={14} color={c.textMuted} filled />
          <Text style={styles.lineText}>{compact(likes)}</Text>
        </>
      ) : null}
      {likes && views ? <Text style={styles.lineText}>·</Text> : null}
      {views ? <Text style={styles.lineText}>{viewText}</Text> : null}
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.white,
    },
    text: { fontFamily: Fonts.sansBold, fontSize: 14, color: c.brownDark },
    line: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    lineText: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
  });
