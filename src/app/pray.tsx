import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/ui';
import { Fonts, Palette } from '@/constants/theme';
import { t } from '@/i18n';
import { success } from '@/lib/haptics';
import { useClips } from '@/state/clips';
import { useContent } from '@/state/content';
import { useLibrary } from '@/state/library';
import { useRhythm } from '@/state/rhythm';
import { useColors, useStyles } from '@/state/theme';

const INK = '#17120E';
const GOLD = '#D4AF73';

/** The third step of today's rhythm: today's word, then today's confession & declaration. */
export default function Pray() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const content = useContent();
  const lib = useLibrary();
  const rhythm = useRhythm();
  const hasSeeds = useClips().clips.length > 0;
  const today = content.today;
  const { prayer } = content;
  const bible = today.lang === 'sw' ? 'SUV' : 'KJV';
  const word = today.scripture?.text ?? today.excerpt;
  const source = today.scripture?.text ? `${today.scripture.ref} · ${bible}` : today.title;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));
  const amen = () => {
    success();
    rhythm.markPrayed();
    // The last step of the day opens the celebration; otherwise back to Today.
    const allDone = lib.readToday && (rhythm.seedToday || !hasSeeds);
    if (allDone) router.replace('/rhythm');
    else close();
  };

  const prompts = [t('Thank God for one thing today.'), t('Pray today’s word over your life.'), t('Remember someone who needs prayer.')];

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <IconButton icon="close" label={t('Close')} variant="plain" onPress={close} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 26, paddingBottom: insets.bottom + 28, gap: 26 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 8 }}>
          <Text style={styles.title} accessibilityRole="header">
            {t('A minute of prayer')}
          </Text>
          <Text style={styles.lead}>
            {prayer ? t('Be still. Read today’s word, then say this aloud.') : t('Be still. Bring today’s word before God.')}
          </Text>
        </View>

        <View style={styles.verse}>
          <Text style={styles.verseText}>{word}</Text>
          <Text style={styles.verseRef}>{source}</Text>
        </View>

        {prayer ? (
          // Staff's confession & declaration for today, said aloud.
          <View style={styles.spoken}>
            <Text style={styles.spokenLabel}>{t('Confess & declare')}</Text>
            <Text style={styles.declaration} selectable>
              {prayer.text}
            </Text>
            {prayer.scripture ? <Text style={styles.spokenRef}>{prayer.scripture}</Text> : null}
          </View>
        ) : (
          <View>
            {prompts.map((p, i) => (
              <View key={p} style={[styles.prompt, i === 0 && { borderTopWidth: 0 }]}>
                <Text style={styles.promptNumber}>{i + 1}</Text>
                <Text style={styles.promptText}>{p}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ gap: 10 }}>
          <Button label={rhythm.prayedToday ? t('Amen — prayed today') : t('Amen')} icon="check" onPress={amen} style={{ minHeight: 56 }} />
          <Button label={t('Send a prayer request')} variant="outline" onPress={() => router.navigate({ pathname: '/live', params: { panel: 'prayer', at: String(Date.now()) } })} />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12 },
    title: { fontFamily: Fonts.displayMedium, fontSize: 44, lineHeight: 46, color: c.text },
    lead: { fontFamily: Fonts.displayItalic, fontSize: 21, lineHeight: 26, color: c.textMuted },
    verse: { alignItems: 'center', gap: 14, paddingVertical: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.goldLine },
    verseText: { fontFamily: Fonts.displayItalic, fontSize: 24, lineHeight: 30, textAlign: 'center', color: c.text },
    verseRef: { fontFamily: Fonts.sansSemiBold, fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: c.eyebrow },
    spoken: { gap: 12, padding: 22, borderRadius: 22, backgroundColor: INK },
    spokenLabel: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: GOLD },
    declaration: { fontFamily: Fonts.displayMedium, fontSize: 23, lineHeight: 31, color: '#FFFFFF' },
    spokenRef: { fontFamily: Fonts.sansSemiBold, fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.65)' },
    prompt: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 58, borderTopWidth: 1, borderTopColor: c.line },
    promptNumber: { width: 22, fontFamily: Fonts.display, fontSize: 24, color: c.accent, fontVariant: ['lining-nums'] },
    promptText: { flex: 1, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, color: c.text },
  });
