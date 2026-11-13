import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logoImage } from '@/components/art';
import { Icon, IconName } from '@/components/icon';
import { Body, Button, Eyebrow } from '@/components/ui';
import { Colors, Fonts, Radius, ScreenPadding } from '@/constants/theme';

const features: { icon: IconName; label: string }[] = [
  { icon: 'sermons', label: 'Sermons' },
  { icon: 'live', label: 'Live' },
  { icon: 'podcast', label: 'Podcast' },
  { icon: 'devotional', label: 'Devotional' },
];

/** Welcome screen shown when the app opens. */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const start = () => router.replace('/home');

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
            <Icon name={f.icon} color={Colors.brown} />
            <Text style={styles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 6 }}>
        <Button label="Get started" icon="arrow" onPress={start} />
        <Button label="I already have an account" variant="outline" onPress={start} style={{ borderColor: 'transparent' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ivory,
    paddingHorizontal: ScreenPadding + 4,
    justifyContent: 'space-between',
    gap: 16,
  },
  logoWrap: { alignSelf: 'center', width: 280, height: 260, alignItems: 'center', justifyContent: 'center' },
  logoDisc: {
    position: 'absolute',
    width: 236,
    height: 236,
    borderRadius: 118,
    backgroundColor: Colors.parchment,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  logo: { width: 260, height: 260 },
  headline: { fontFamily: Fonts.display, fontSize: 42, lineHeight: 44, color: Colors.text },
  headlineEm: { fontFamily: Fonts.displayItalic, color: Colors.brown },
  features: { flexDirection: 'row', gap: 8 },
  feature: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.parchment,
  },
  featureLabel: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: Colors.brownDark },
});
