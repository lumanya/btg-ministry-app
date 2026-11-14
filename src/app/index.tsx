import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logoImage } from '@/components/art';
import { Icon, IconName } from '@/components/icon';
import { Body, Button, Eyebrow } from '@/components/ui';
import { Brand, Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { useAuth } from '@/state/auth';
import { useColors, useStyles } from '@/state/theme';

const features: { icon: IconName; label: string }[] = [
  { icon: 'sermons', label: 'Sermons' },
  { icon: 'live', label: 'Live' },
  { icon: 'podcast', label: 'Podcast' },
  { icon: 'devotional', label: 'Devotional' },
];

/** Welcome screen: shown until someone signs in or chooses to continue as a guest. */
export default function Welcome() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  // Wait for the saved sign-in to load, then skip this screen for returning members and guests.
  if (!auth.ready) return <View style={styles.root} />;
  if (auth.session || auth.guest) return <Redirect href="/home" />;

  const guest = () => {
    auth.continueAsGuest();
    router.replace('/home');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.logoWrap}>
        <View style={styles.logoDisc} />
        <Image
          source={logoImage}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="The BTG Ministry emblem: an eagle alighting on a bound scroll, with the words Building the Temple of God Ministry"
        />
      </View>

      <View style={{ gap: 14 }}>
        <Eyebrow>BTG Ministry</Eyebrow>
        <Text style={styles.headline} accessibilityRole="header">
          Revealing Christ. <Text style={styles.headlineEm}>Awakening</Text> the spirit of man.
        </Text>
        <Body style={{ fontSize: 16 }}>Sermons, livestreams, audio teachings and the daily devotional, together in one place.</Body>
      </View>

      <View style={styles.features}>
        {features.map((f) => (
          <View key={f.label} style={styles.feature}>
            <Icon name={f.icon} color={c.accent} />
            <Text style={styles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 6 }}>
        <Button label="Create an account" icon="arrow" onPress={() => router.push('/sign-up')} />
        <Button label="Sign in" variant="outline" onPress={() => router.push('/sign-in')} />
        <Button label="Continue as a guest" variant="outline" onPress={guest} style={{ borderColor: 'transparent', minHeight: 46 }} />
      </View>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.ivory,
    paddingHorizontal: ScreenPadding + 4,
    justifyContent: 'space-between',
    gap: 16,
  },
  logoWrap: { alignSelf: 'center', width: 250, height: 228, alignItems: 'center', justifyContent: 'center' },
  logoDisc: {
    position: 'absolute',
    width: 208,
    height: 208,
    borderRadius: 104,
    // The logo artwork is drawn for a light background, so its disc stays light in dark mode.
    backgroundColor: Brand.parchment,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  logo: { width: 230, height: 230 },
  headline: { fontFamily: Fonts.display, fontSize: 42, lineHeight: 44, color: c.text },
  headlineEm: { fontFamily: Fonts.displayItalic, color: c.accent },
  features: { flexDirection: 'row', gap: 8 },
  feature: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: c.parchment,
  },
  featureLabel: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: c.brownDark },
});
