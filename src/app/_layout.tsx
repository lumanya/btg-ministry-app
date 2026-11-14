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

import { AuthProvider } from '@/state/auth';
import { FeedProvider } from '@/state/feed';
import { PlayerProvider } from '@/state/player';
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

  // Keep the splash screen up until the brand fonts are ready.
  if (!loaded && !error) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <FeedProvider>
          <PlayerProvider>
            <AppStack />
          </PlayerProvider>
        </FeedProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppStack() {
  const { colors: c, isDark } = useTheme();

  // The window behind the screens (seen during transitions) follows the theme too.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.ivory).catch(() => {});
  }, [c.ivory]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ivory } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sermon/[id]" />
        <Stack.Screen name="devotional/[id]" />
        <Stack.Screen name="player" options={{ presentation: 'modal' }} />
        <Stack.Screen name="give" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="verify" />
        <Stack.Screen name="forgot-password" />
      </Stack>
    </>
  );
}
