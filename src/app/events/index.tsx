import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { Eagle } from '@/components/art';
import { EventCard } from '@/components/event-card';
import { Appear } from '@/components/motion';
import { Body, IconButton, Title } from '@/components/ui';
import { Palette, Radius, ScreenPadding } from '@/constants/theme';
import { useContent } from '@/state/content';
import { useColors, useStyles } from '@/state/theme';

/** Conferences and special services, soonest first. */
export default function EventsScreen() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const content = useContent();
  const events = content.upcoming;

  return (
    <View style={{ flex: 1, backgroundColor: c.ivory }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="back" label={t('Back')} variant="plain" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: ScreenPadding, paddingBottom: insets.bottom + 32, gap: 16 }}>
        <Title size={38}>{t('Events')}</Title>
        {events.length ? (
          events.map((e, i) => (
            <Appear key={e.id} index={i}>
              <EventCard event={e} onPress={() => router.push({ pathname: '/events/[id]', params: { id: e.id } })} />
            </Appear>
          ))
        ) : (
          <View style={styles.empty}>
            <Eagle height={54} />
            <Title size={24} style={{ textAlign: 'center' }}>
              {t('No events announced yet')}
            </Title>
            <Body style={{ textAlign: 'center' }}>{t('Conferences and special services will appear here. Turn on event notifications in Settings to hear first.')}</Body>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    topBar: { paddingHorizontal: 12, paddingBottom: 4 },
    empty: { alignItems: 'center', gap: 12, padding: 28, borderRadius: Radius.xl, backgroundColor: c.parchment },
  });
