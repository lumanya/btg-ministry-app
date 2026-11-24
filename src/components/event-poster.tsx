import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { EagleMark } from '@/components/eagle-mark';
import { IconButton, SectionHeader, Tap } from '@/components/ui';
import { Fonts, Palette, ScreenPadding } from '@/constants/theme';
import { dateNames, t } from '@/i18n';
import { dateTile, daysUntil, eventWhen, MinistryEvent } from '@/lib/content';
import { useNotifications } from '@/state/notifications';
import { useColors, useStyles } from '@/state/theme';

const INK = '#17120E';
const GOLD = '#D4AF73';

/**
 * An event's poster at its own shape (never cropped: its words are the point).
 * Shown 4:5 until the picture loads. Without a poster: the gold eagle and the
 * title on ink, in the same shape.
 */
export function PosterImage({ event, width, maxHeight, radius = 18 }: { event: MinistryEvent; width: number; maxHeight?: number; radius?: number }) {
  const [ratio, setRatio] = useState(0.8);
  let w = width;
  let h = width / ratio;
  if (maxHeight && h > maxHeight) {
    h = maxHeight;
    w = maxHeight * ratio;
  }
  if (!event.imageUrl) {
    return (
      <View style={[styles.fallback, { width, height: width / 0.8, borderRadius: radius }]} accessible={false}>
        <EagleMark height={width * 0.2} color={GOLD} />
        <Text style={[styles.fallbackTitle, { fontSize: Math.round(width * 0.11), lineHeight: Math.round(width * 0.115) }]} numberOfLines={4}>
          {event.title}
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: event.imageUrl }}
      style={{ width: w, height: h, borderRadius: radius, backgroundColor: INK }}
      contentFit="contain"
      transition={250}
      onLoad={(e) => {
        const { width: iw, height: ih } = e.source;
        if (iw > 0 && ih > 0) setRatio(Math.max(0.5, Math.min(1.25, iw / ih)));
      }}
      accessibilityLabel={t('Poster: {title}', { title: event.title })}
    />
  );
}

/** "today", "tomorrow", "in 14 days" — or nothing once it has started. */
export function whenFromNow(iso: string): string | null {
  const n = daysUntil(iso);
  if (n < 0) return null;
  if (n === 0) return t('today');
  if (n === 1) return t('tomorrow');
  return t('in {n} days', { n });
}

/** Today's "Coming up" card: the poster, then the date, title, time and a reminder bell. */
export function EventPosterCard({ event, width, onPress }: { event: MinistryEvent; width: number; onPress: () => void }) {
  const c = useColors();
  const themed = useStyles(createStyles);
  const notify = useNotifications();
  const reminded = notify.isReminded(event.id);
  const tile = dateTile(event.startsAt, dateNames());
  const when = eventWhen(event, dateNames());
  const soon = whenFromNow(event.startsAt);
  const line = [when.multiDay ? when.day : when.day.split(',')[0], when.multiDay ? null : when.time, soon].filter(Boolean).join(' · ');

  return (
    <View style={{ width, gap: 12 }}>
      <Tap haptic="tap" accessibilityRole="button" accessibilityLabel={`${event.title}, ${line}`} onPress={onPress} style={themed.poster}>
        <PosterImage event={event} width={width} />
      </Tap>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={styles.tile}>
          <Text style={styles.tileMonth}>{tile.month}</Text>
          <Text style={styles.tileDay}>{tile.day}</Text>
        </View>
        <Tap accessibilityRole="button" onPress={onPress} style={{ flex: 1, gap: 3 }}>
          <Text style={themed.title} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={themed.meta} numberOfLines={1}>
            {line}
          </Text>
        </Tap>
        <IconButton
          icon={reminded ? 'check' : 'bell'}
          label={reminded ? t('Reminder set for {title}', { title: event.title }) : t('Remind me about {title}', { title: event.title })}
          selected={reminded}
          onPress={async () => {
            if (reminded) await notify.cancelReminder(event.id);
            else await notify.remind(event);
          }}
          style={{ borderColor: c.accent, backgroundColor: reminded ? c.sand : 'transparent' }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: INK, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 22 },
  fallbackTitle: { fontFamily: Fonts.display, color: '#FFFFFF', textAlign: 'center' },
  tile: { width: 52, height: 58, borderRadius: 14, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  tileMonth: { fontFamily: Fonts.sansBold, fontSize: 10, letterSpacing: 1.4, color: GOLD },
  tileDay: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 28, color: '#FFFFFF', fontVariant: ['lining-nums'] },
});

const createStyles = (c: Palette) =>
  StyleSheet.create({
    poster: {
      alignSelf: 'flex-start',
      borderRadius: 18,
      shadowColor: '#17120E',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    title: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 24, color: c.text },
    meta: { fontFamily: Fonts.sans, fontSize: 13, color: c.textMuted },
  });

/** Today's "Coming up": the next posters side by side, straight after Seeds. */
export function ComingUpRail({ events, onOpen, onAll }: { events: MinistryEvent[]; onOpen: (id: string) => void; onAll: () => void }) {
  const { width: screen } = useWindowDimensions();
  if (!events.length) return null;
  const shown = events.slice(0, 6);
  const single = shown.length === 1;
  // A little smaller than the screen, so Seeds above keeps the lead.
  const cardWidth = single ? Math.min(screen - ScreenPadding * 2, 300) : Math.min(screen * 0.66, 250);
  return (
    <View style={{ gap: 14 }}>
      <SectionHeader title={t('Coming up')} action={events.length > 1 ? t('All events') : undefined} onAction={onAll} />
      {single ? (
        <EventPosterCard event={shown[0]} width={cardWidth} onPress={() => onOpen(shown[0].id)} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={cardWidth + 14}
          style={{ marginHorizontal: -ScreenPadding }}
          // Bottom-aligned, so the dates line up whatever shape each poster is.
          contentContainerStyle={{ paddingHorizontal: ScreenPadding, gap: 14, paddingBottom: 6, alignItems: 'flex-end' }}>
          {shown.map((e) => (
            <EventPosterCard key={e.id} event={e} width={cardWidth} onPress={() => onOpen(e.id)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
