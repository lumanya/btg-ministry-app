import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Tap } from '@/components/ui';
import { Fonts, Palette, Radius } from '@/constants/theme';
import { dateTile, eventWhen, MinistryEvent } from '@/lib/content';
import { useColors, useStyles } from '@/state/theme';

/** An upcoming event: picture (if any), date tile, title, time and place. */
export function EventCard({ event, onPress, compact = false }: { event: MinistryEvent; onPress: () => void; compact?: boolean }) {
  const c = useColors();
  const styles = useStyles(createStyles);
  const when = eventWhen(event);
  const tile = dateTile(event.startsAt);
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${when.day}, ${when.time}${event.locationName ? `, ${event.locationName}` : ''}`}
      onPress={onPress}
      style={styles.card}>
      {event.imageUrl && !compact ? (
        <Image source={{ uri: event.imageUrl }} style={styles.image} contentFit="cover" transition={200} accessible={false} />
      ) : null}
      <View style={styles.body}>
        <View style={styles.tile}>
          <Text style={styles.tileMonth}>{tile.month}</Text>
          <Text style={styles.tileDay}>{tile.day}</Text>
        </View>
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
        </View>
        <Icon name="chevron" size={18} color={c.accent} />
      </View>
    </Tap>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    card: { borderRadius: Radius.lg, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, overflow: 'hidden' },
    image: { height: 150, backgroundColor: c.artDeep },
    body: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
    tile: { width: 56, height: 62, borderRadius: 14, backgroundColor: c.parchment, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
    tileMonth: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 1.2, color: c.eyebrow },
    tileDay: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 30, color: c.text },
    title: { fontFamily: Fonts.display, fontSize: 21, lineHeight: 23, color: c.text },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    meta: { flex: 1, fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
  });
