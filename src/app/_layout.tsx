import {
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { useUpdateChecks } from '@/components/update-banner';
import { keepPortrait } from '@/lib/orientation';
import { AuthProvider } from '@/state/auth';
import { DataSaverProvider } from '@/state/data-saver';
import { LanguageProvider } from '@/state/language';
import { ContentProvider } from '@/state/content';
import { ClipsProvider } from '@/state/clips';
import { FeedProvider } from '@/state/feed';
import { LibraryProvider } from '@/state/library';
import { NotificationsProvider } from '@/state/notifications';
import { PlayerProvider } from '@/state/player';
import { RhythmProvider } from '@/state/rhythm';
import { ThemeProvider, useTheme } from '@/state/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // Screens stay upright; only full-screen video turns sideways (src/lib/orientation.ts).
  useEffect(() => {
    keepPortrait();
  }, []);

  // Keep the splash screen up until the brand fonts are ready.
  if (!loaded && !error) return null;

  return (
    <LanguageProvider>
      <DataSaverProvider>
        <ThemeProvider>
          <AuthProvider>
            <ContentProvider>
              <FeedProvider>
                <ClipsProvider>
                  <PlayerProvider>
                    <LibraryProvider>
                      <RhythmProvider>
                        <NotificationsProvider>
                          <AppStack />
                        </NotificationsProvider>
                      </RhythmProvider>
                    </LibraryProvider>
                  </PlayerProvider>
                </ClipsProvider>
              </FeedProvider>
            </ContentProvider>
          </AuthProvider>
        </ThemeProvider>
      </DataSaverProvider>
    </LanguageProvider>
  );
}

function AppStack() {
  const { colors: c, isDark } = useTheme();
  useUpdateChecks();

  // The window behind the screens (seen during transitions) follows the theme too.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.ivory).catch(() => {});
  }, [c.ivory]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ivory } }}>
        <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: '#17120E' } }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sermon/[id]" />
        <Stack.Screen name="clips" options={{ animation: 'none' }} />
        <Stack.Screen name="rhythm" options={{ presentation: 'fullScreenModal', animation: 'fade', contentStyle: { backgroundColor: '#17120E' } }} />
        <Stack.Screen name="pray" options={{ presentation: 'modal' }} />
        <Stack.Screen name="setup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="devotional/[id]" />
        <Stack.Screen name="player" options={{ presentation: 'modal', contentStyle: { backgroundColor: '#17120E' } }} />
        <Stack.Screen name="give" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="saved" />
        <Stack.Screen name="playlist/[id]" />
        <Stack.Screen name="events/index" />
        <Stack.Screen name="events/[id]" />
        <Stack.Screen name="share" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="verify" />
        <Stack.Screen name="forgot-password" />
      </Stack>
    </>
  );
}
