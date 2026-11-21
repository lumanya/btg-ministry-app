import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { FormMessage } from '@/components/form';
import { CARD_THEMES, CardFormat, CardKind, CardRef, CardTheme, ShareCard } from '@/components/share-card';
import { Button, IconButton, Tap, Title } from '@/components/ui';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { success, tick } from '@/lib/haptics';
import { useColors, useStyles } from '@/state/theme';

export type ShareParams = { kind: CardKind; text: string; attribution?: string; title?: string; link?: string; format?: CardFormat; theme?: CardTheme };

/** Pick a look, then share the card as an image (WhatsApp, Instagram, anywhere). */
export default function ShareScreen() {
  const c = useColors();
  const styles = useStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const params = useLocalSearchParams<ShareParams>();
  const kind = (['quote', 'verse', 'devotional', 'event', 'week'].includes(params.kind) ? params.kind : 'quote') as CardKind;
  const text = String(params.text ?? '');
  const card = useRef<CardRef>(null);
  const [theme, setTheme] = useState<CardTheme>(params.theme && params.theme in CARD_THEMES ? params.theme : 'ink');
  const [format, setFormat] = useState<CardFormat>(params.format === 'post' || params.format === 'status' ? params.format : 'post');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fit the preview on screen, leaving room for the controls.
  const ratio = format === 'status' ? 16 / 9 : 5 / 4;
  const width = Math.round(Math.min(screenW - ScreenPadding * 2, 380, (screenH - 340) / ratio));

  const asText =
    kind === 'week'
      ? t('{n} days in a row in the Word with BTG Ministry.', { n: text })
      : [params.title, text, params.attribution].filter(Boolean).join('\n');
  const footer = params.link ? `\n\n${params.link}` : '\n\nBTG Ministry · btgministry.org';

  const shareImage = async () => {
    setError(null);
    setBusy(true);
    try {
      const outW = 1080;
      const uri = await captureRef(card, {
        format: 'png',
        quality: 1,
        width: outW,
        height: Math.round(outW * ratio),
        result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
      });
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = uri;
        a.download = 'btg-ministry.png';
        a.click();
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('Share') });
      } else {
        await Share.share({ message: asText + footer });
      }
      success();
    } catch (err) {
      console.warn('Could not share the card', err);
      setError('Couldn’t make the image. You can share it as text instead.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.parchment }}>
      <View style={[styles.topBar, { paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 4 }]}>
        <Title size={26}>{t('Share')}</Title>
        <IconButton icon="down" label={t('Close')} variant="plain" onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
      </View>
      <ScrollView contentContainerStyle={{ alignItems: 'center', gap: 18, paddingHorizontal: ScreenPadding, paddingBottom: insets.bottom + 28 }}>
        <View style={styles.preview}>
          <ShareCard ref={card} kind={kind} text={text} attribution={params.attribution} title={params.title} theme={theme} format={format} width={width} />
        </View>

        <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('Card colour')}>
          {(Object.keys(CARD_THEMES) as CardTheme[]).map((k) => {
            const on = k === theme;
            return (
              <Tap
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={t(CARD_THEMES[k].label)}
                onPress={() => {
                  tick();
                  setTheme(k);
                }}
                style={[styles.swatchWrap, on && { borderColor: c.accent }]}>
                <View style={[styles.swatch, { backgroundColor: CARD_THEMES[k].bg, borderColor: CARD_THEMES[k].rule }]} />
                <Text style={[styles.swatchText, on && { color: c.text }]}>{t(CARD_THEMES[k].label)}</Text>
              </Tap>
            );
          })}
        </View>

        <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={t('Card shape')}>
          {(
            [
              ['post', t('Chat & post')],
              ['status', t('Status & story')],
            ] as [CardFormat, string][]
          ).map(([k, label]) => {
            const on = k === format;
            return (
              <Tap
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  tick();
                  setFormat(k);
                }}
                style={[styles.segmentItem, on && { backgroundColor: c.brown }]}>
                <Text style={[styles.segmentText, on && { color: c.cream }]}>{t(label)}</Text>
              </Tap>
            );
          })}
        </View>

        {error ? <FormMessage>{error}</FormMessage> : null}
        <View style={{ alignSelf: 'stretch', gap: 10 }}>
          <Button label={busy ? t('Preparing…') : Platform.OS === 'web' ? t('Download image') : t('Share image')} icon="image" onPress={busy ? undefined : shareImage} />
          <Button label={t('Share as text')} variant="outline" onPress={() => Share.share({ message: asText + footer })} />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ScreenPadding, paddingBottom: 12 },
    preview: {
      borderRadius: 18,
      overflow: 'hidden',
      shadowColor: '#3A2413',
      shadowOpacity: 0.16,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    row: { flexDirection: 'row', gap: 10 },
    swatchWrap: { alignItems: 'center', gap: 6, padding: 8, borderRadius: Radius.md, borderWidth: 2, borderColor: 'transparent', minWidth: 76 },
    swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 1 },
    swatchText: { fontFamily: Fonts.sansSemiBold, fontSize: 13, color: c.textMuted },
    segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: Radius.pill, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, alignSelf: 'stretch' },
    segmentItem: { flex: 1, height: 42, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
    segmentText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.brownDark },
  });
