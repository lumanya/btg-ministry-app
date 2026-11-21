import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { Tap } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { t } from '@/i18n';

/**
 * Over-the-air updates (EAS Update).
 *
 * The app checks for a new version each time it starts (app.json `updates`), and
 * again when it comes back to the foreground after a while. A downloaded update
 * is used on the next start; Today offers to restart into it straight away.
 *
 * Only release builds on phones get updates (not Expo Go, development or the web).
 */
const ON = Platform.OS !== 'web' && Updates.isEnabled && !__DEV__;
/** Don't check more often than this when the app is reopened. */
const RECHECK_MS = 30 * 60 * 1000;

/** Checks again when the app returns to the foreground. Mount once, near the root. */
export function useUpdateChecks() {
  const lastCheck = useRef(0);
  useEffect(() => {
    if (!ON) return;
    // The app itself checked on start.
    lastCheck.current = Date.now();
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || Date.now() - lastCheck.current < RECHECK_MS) return;
      lastCheck.current = Date.now();
      Updates.checkForUpdateAsync()
        .then((r) => (r.isAvailable ? Updates.fetchUpdateAsync() : null))
        .catch(() => {});
    });
    return () => sub.remove();
  }, []);
}

/** "A new version is ready" with a Restart button, once an update has downloaded. */
export function UpdateBanner() {
  if (!ON) return null;
  return <PendingUpdate />;
}

function PendingUpdate() {
  const { isUpdatePending } = Updates.useUpdates();
  if (!isUpdatePending) return null;
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.banner} accessibilityLiveRegion="polite">
      <Icon name="replay" size={20} color="#D4AF73" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title}>{t('A new version is ready')}</Text>
        <Text style={styles.text}>{t('Restart to get the latest improvements.')}</Text>
      </View>
      <Tap accessibilityRole="button" onPress={() => Updates.reloadAsync().catch(() => {})} style={styles.button}>
        <Text style={styles.buttonText}>{t('Restart')}</Text>
      </Tap>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 16, paddingRight: 10, borderRadius: 18, backgroundColor: '#17120E' },
  title: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: '#FFFFFF' },
  text: { fontFamily: Fonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.72)' },
  button: { minHeight: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#D4AF73', justifyContent: 'center' },
  buttonText: { fontFamily: Fonts.sansBold, fontSize: 14, color: '#17120E' },
});
