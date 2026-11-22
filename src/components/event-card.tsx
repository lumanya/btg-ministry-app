import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { dateNames } from '@/i18n';
import { Icon } from '@/components/icon';
import { StatLine } from '@/components/like-button';
import { Tap } from '@/components/ui';
import { Fonts, Palette, Radius } from '@/constants/theme';
import { dateTile, eventWhen, MinistryEvent } from '@/lib/content';
import { useStat } from '@/state/engagement';
import { useColors, useStyles } from '@/state/theme';

/** An upcoming event: its poster (or a date tile), title, time and place. */
export function EventCard({ event, onPress, compact = false }: { event: MinistryEvent; onPress: () => void; compact?: boolean }) {
  const c = useColors();
  const styles = useStyles(createStyles);
  const when = eventWhen(event, dateNames());
  const tile = dateTile(event.startsAt, dateNames());
  const stat = useStat('event', event.id);
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${when.day}, ${when.time}${event.locationName ? `, ${event.locationName}` : ''}`}
      onPress={onPress}
      style={styles.card}>
      <View style={styles.body}>
        {event.imageUrl && !compact ? (
          // The whole poster, small: its words are part of it, so it is never cropped.
          <Image source={{ uri: event.imageUrl }} style={styles.poster} contentFit="contain" transition={200} accessible={false} />
        ) : (
          <View style={styles.tile}>
            <Text style={styles.tileMonth}>{tile.month}</Text>
            <Text style={styles.tileDay}>{tile.day}</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={styles.metaRow}>
            <Icon name="clock" size={14} color={c.textMuted} />
            <Text style={styles.meta} numberOfLines={1}>
              {when.multiDay ? when.day : `${when.day.split(',')[0]} · ${when.time}`}
            </Text>
          </View>
          {event.locationName ? (
            <View style={styles.metaRow}>
              <Icon name="pin" size={14} color={c.textMuted} />
              <Text style={styles.meta} numberOfLines={1}>
                {event.locationName}
              </Text>
            </View>
          ) : null}
          {stat ? <StatLine likes={stat.likes} views={stat.views} viewWord="views" /> : null}
        </View>
        <Icon name="chevron" size={18} color={c.accent} />
      </View>
    </Tap>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    card: { borderRadius: Radius.lg, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, overflow: 'hidden' },
    poster: { width: 76, height: 95, borderRadius: 10, backgroundColor: '#17120E' },
    body: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
    tile: { width: 56, height: 62, borderRadius: 14, backgroundColor: c.parchment, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
    tileMonth: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 1.2, color: c.eyebrow },
    tileDay: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 30, color: c.text, fontVariant: ['lining-nums'] },
    title: { fontFamily: Fonts.display, fontSize: 21, lineHeight: 23, color: c.text },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    meta: { flex: 1, fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
  });
