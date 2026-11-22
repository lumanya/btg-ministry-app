import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EagleMark } from '@/components/eagle-mark';
import { Icon } from '@/components/icon';
import { Tap } from '@/components/ui';
import { Fonts, ScreenPadding } from '@/constants/theme';
import { t } from '@/i18n';
import { tick } from '@/lib/haptics';
import { useAuth } from '@/state/auth';
import { useLanguage } from '@/state/language';

const INK = '#17120E';
const GOLD = '#D4AF73';
const WHITE = '#FFFFFF';
const SOFT = 'rgba(255,255,255,0.72)';

/** Welcome: shown until someone signs in or chooses to look around as a guest. */
export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const language = useLanguage();

  // Wait for the saved sign-in to load, then skip this screen for returning members and guests.
  if (!auth.ready) return <View style={styles.root} />;
  if (auth.session || auth.guest) return <Redirect href="/home" />;

  const guest = () => {
    auth.continueAsGuest();
    router.replace('/home');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar style="light" />
      <View style={styles.languages} accessibilityRole="radiogroup" accessibilityLabel={t('Language')}>
        {(
          [
            ['en', 'English'],
            ['sw', 'Kiswahili'],
          ] as const
        ).map(([code, name]) => {
          const on = language.lang === code;
          return (
            <Tap
              key={code}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => {
                tick();
                language.setPreference(code);
              }}
              style={[styles.language, on && styles.languageOn]}>
              <Text style={[styles.languageText, on && { color: WHITE }]}>{name}</Text>
            </Tap>
          );
        })}
      </View>

      <View style={styles.middle}>
        <Animated.View entering={FadeIn.duration(600)}>
          <EagleMark height={136} color={GOLD} label={t('The BTG Ministry eagle')} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={{ gap: 16 }}>
          <Text style={styles.headline} accessibilityRole="header">
            {t('Revealing Christ.')} <Text style={styles.headlineEm}>{t('Awakening')}</Text> {t('the spirit of man.')}
          </Text>
          <Text style={styles.lead}>{t('Sermons, one-minute seeds, the daily word and prayer — every day, in one place.')}</Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{ gap: 10 }}>
        <Tap haptic="tap" accessibilityRole="button" onPress={() => router.push('/sign-up')} style={styles.primary}>
          <Text style={styles.primaryText}>{t('Get started')}</Text>
          <Icon name="arrow" size={18} color={INK} />
        </Tap>
        <Tap accessibilityRole="button" onPress={() => router.push('/sign-in')} style={styles.secondary}>
          <Text style={styles.secondaryText}>{t('I already have an account')}</Text>
        </Tap>
        <Tap accessibilityRole="button" onPress={guest} style={styles.quiet}>
          <Text style={styles.quietText}>{t('Look around first')}</Text>
        </Tap>
        <Text style={styles.footer}>BUILDING THE TEMPLE OF GOD</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: INK, paddingHorizontal: ScreenPadding + 6 },
  languages: { alignSelf: 'flex-end', flexDirection: 'row', padding: 3, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  language: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  languageOn: { backgroundColor: 'rgba(255,255,255,0.14)' },
  languageText: { fontFamily: Fonts.sansSemiBold, fontSize: 13, color: SOFT },
  middle: { flex: 1, justifyContent: 'center', gap: 30 },
  headline: { fontFamily: Fonts.displayMedium, fontSize: 48, lineHeight: 50, color: WHITE },
  headlineEm: { fontFamily: Fonts.displayItalic, color: GOLD },
  lead: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, color: SOFT },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56, borderRadius: 16, backgroundColor: GOLD },
  primaryText: { fontFamily: Fonts.sansBold, fontSize: 16, color: INK },
  secondary: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: Fonts.sansSemiBold, fontSize: 16, color: WHITE },
  quiet: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  quietText: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  footer: { marginTop: 6, textAlign: 'center', fontFamily: Fonts.sansSemiBold, fontSize: 10, letterSpacing: 2.6, color: 'rgba(255,255,255,0.5)' },
});
