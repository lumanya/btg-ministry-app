import { Image } from 'expo-image';
import type { ComponentRef, Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { t, weekLetters } from '@/i18n';
import { eagleCreamImage, eagleImage, EAGLE_RATIO } from '@/components/art';
import { Fonts } from '@/constants/theme';

/**
 * The image members share to WhatsApp: a quote, verse, devotional line or event
 * on BTG Ministry's colours, with the eagle and the website. Fixed colours (not the
 * app's light or dark mode) so every shared card looks the same.
 */

export type CardKind = 'quote' | 'verse' | 'devotional' | 'event' | 'week';
export type CardTheme = 'ink' | 'ivory' | 'latte' | 'night';
export type CardFormat = 'post' | 'status';

export const CARD_THEMES: Record<CardTheme, { label: string; bg: string; panel: string; text: string; muted: string; accent: string; rule: string; lightEagle: boolean }> = {
  ink: { label: 'Ink', bg: '#17120E', panel: '#241C16', text: '#FFFFFF', muted: '#CDBAA2', accent: '#D4AF73', rule: '#3A2E24', lightEagle: true },
  ivory: { label: 'Ivory', bg: '#FFFDFA', panel: '#F6EEE2', text: '#2B1D12', muted: '#6B5644', accent: '#8B5A2B', rule: '#E0D3C1', lightEagle: false },
  latte: { label: 'Latte', bg: '#EFE3D3', panel: '#E4D3BD', text: '#2B1D12', muted: '#5C4634', accent: '#7A4E26', rule: '#CDB596', lightEagle: false },
  night: { label: 'Night', bg: '#1C140E', panel: '#2A1F17', text: '#F5EFE7', muted: '#CDBAA2', accent: '#E2B57A', rule: '#4A3828', lightEagle: true },
};

const KICKER: Record<CardKind, string> = {
  quote: 'Word for today',
  verse: 'Scripture',
  devotional: 'Daily devotional',
  event: 'You’re invited',
  week: 'My week in the Word',
};

export type CardContent = {
  kind: CardKind;
  /** The quote, verse or line; for events, when it happens; for a week, the streak count. */
  text: string;
  /** Who said it, the reference, or the place. */
  attribution?: string;
  /** Devotional or event title; for a week, one letter per day Monday first (r read, g grace, f future, - missed). */
  title?: string;
};

export type CardRef = ComponentRef<typeof View>;

type Props = CardContent & { theme: CardTheme; format: CardFormat; width: number; ref?: Ref<CardRef> };

export function ShareCard({ kind, text, attribution, title, theme, format, width, ref }: Props) {
  const th = CARD_THEMES[theme];
  const height = Math.round(width * (format === 'status' ? 16 / 9 : 5 / 4));
  const u = width / 360; // design units: the card is laid out at 360 wide
  const isEvent = kind === 'event';
  if (kind === 'week') return <WeekCard ref={ref} streak={Number(text) || 0} days={title ?? ''} th={th} width={width} height={height} u={u} />;
  const body = isEvent ? title ?? '' : text;
  // Shorter text gets bigger type.
  const len = body.length;
  const size = (len < 90 ? 30 : len < 160 ? 26 : len < 260 ? 22 : 19) * u * (format === 'status' ? 1.08 : 1);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ width, height, backgroundColor: th.bg, padding: 28 * u, justifyContent: 'space-between', overflow: 'hidden' }}>
      {/* A thin temple arch behind everything, from the logo. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 40 * u,
          right: 40 * u,
          top: 108 * u,
          bottom: -20 * u,
          borderWidth: 1,
          borderColor: th.rule,
          borderTopLeftRadius: 160 * u,
          borderTopRightRadius: 160 * u,
        }}
      />

      <View style={{ alignItems: 'center', gap: 10 * u }}>
        <Image source={th.lightEagle ? eagleCreamImage : eagleImage} style={{ width: 34 * u * EAGLE_RATIO, height: 34 * u }} contentFit="contain" />
        <Text style={[styles.kicker, { color: th.accent, fontSize: 11 * u, letterSpacing: 2.4 * u }]}>{t(KICKER[kind])}</Text>
      </View>

      <View style={{ alignItems: 'center', gap: 16 * u, paddingHorizontal: 6 * u }}>
        {!isEvent ? <Text style={[styles.mark, { color: th.accent, fontSize: 64 * u, lineHeight: 52 * u }]}>“</Text> : null}
        {kind === 'devotional' && title ? (
          <Text style={[styles.title, { color: th.muted, fontSize: 15 * u }]}>{title}</Text>
        ) : null}
        <Text style={[isEvent ? styles.eventTitle : styles.quote, { color: th.text, fontSize: isEvent ? 34 * u : size, lineHeight: (isEvent ? 36 : size / u * 1.22) * u }]}>
          {body}
        </Text>
        {isEvent ? (
          <View style={{ alignItems: 'center', gap: 4 * u, paddingVertical: 10 * u, paddingHorizontal: 16 * u, borderRadius: 14 * u, backgroundColor: th.panel }}>
            <Text style={[styles.eventWhen, { color: th.text, fontSize: 15 * u }]}>{text}</Text>
            {attribution ? <Text style={[styles.attr, { color: th.muted, fontSize: 13 * u }]}>{attribution}</Text> : null}
          </View>
        ) : attribution ? (
          <View style={{ alignItems: 'center', gap: 8 * u }}>
            <View style={{ width: 28 * u, height: 1.5 * u, backgroundColor: th.accent }} />
            <Text style={[styles.attr, { color: th.muted, fontSize: 13 * u, letterSpacing: 1.2 * u }]}>{attribution}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ alignItems: 'center', gap: 2 * u }}>
        <Text style={[styles.brand, { color: th.text, fontSize: 17 * u }]}>BTG Ministry</Text>
        <Text style={[styles.site, { color: th.muted, fontSize: 11 * u }]}>Building the Temple of God · btgministry.org</Text>
      </View>
    </View>
  );
}

/** "12 days in the Word" with the week's days, for sharing a streak. */
function WeekCard({ streak, days, th, width, height, u, ref }: { streak: number; days: string; th: (typeof CARD_THEMES)[CardTheme]; width: number; height: number; u: number; ref?: Ref<CardRef> }) {
  const letters = weekLetters();
  return (
    <View ref={ref} collapsable={false} style={{ width, height, backgroundColor: th.bg, padding: 28 * u, justifyContent: 'space-between', overflow: 'hidden' }}>
      <View style={{ alignItems: 'center', gap: 10 * u }}>
        <Image source={th.lightEagle ? eagleCreamImage : eagleImage} style={{ width: 34 * u * EAGLE_RATIO, height: 34 * u }} contentFit="contain" />
        <Text style={[styles.kicker, { color: th.accent, fontSize: 11 * u, letterSpacing: 2.4 * u }]}>{t(KICKER.week)}</Text>
      </View>
      <View style={{ alignItems: 'center', gap: 6 * u }}>
        <Text style={{ fontFamily: Fonts.display, fontSize: 150 * u, lineHeight: 146 * u, color: th.accent, fontVariant: ['lining-nums'] }}>{streak}</Text>
        <Text style={[styles.quote, { color: th.text, fontSize: 30 * u, lineHeight: 34 * u }]}>{streak === 1 ? t('day in the Word') : t('days in the Word')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 * u, marginTop: 22 * u }}>
          {letters.map((l, i) => {
            const d = days[i] ?? '-';
            return (
              <View key={i} style={{ alignItems: 'center', gap: 6 * u }}>
                <View
                  style={{
                    width: 30 * u,
                    height: 30 * u,
                    borderRadius: 15 * u,
                    backgroundColor: d === 'r' ? th.accent : d === 'g' ? 'transparent' : th.panel,
                    borderWidth: d === 'g' ? 1.5 * u : 0,
                    borderStyle: 'dashed',
                    borderColor: th.accent,
                  }}
                />
                <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 11 * u, color: th.muted }}>{l}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ alignItems: 'center', gap: 2 * u }}>
        <Text style={[styles.brand, { color: th.text, fontSize: 17 * u }]}>BTG Ministry</Text>
        <Text style={[styles.site, { color: th.muted, fontSize: 11 * u }]}>Building the Temple of God · btgministry.org</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: Fonts.sansBold, textTransform: 'uppercase' },
  mark: { fontFamily: Fonts.display, marginBottom: -18 },
  title: { fontFamily: Fonts.sansSemiBold, textAlign: 'center' },
  quote: { fontFamily: Fonts.displayItalic, textAlign: 'center' },
  eventTitle: { fontFamily: Fonts.display, textAlign: 'center' },
  eventWhen: { fontFamily: Fonts.sansSemiBold, textAlign: 'center' },
  attr: { fontFamily: Fonts.sansSemiBold, textAlign: 'center', textTransform: 'uppercase' },
  brand: { fontFamily: Fonts.display },
  site: { fontFamily: Fonts.sans },
});
