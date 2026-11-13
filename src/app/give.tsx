import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Body, Eyebrow, IconButton, Tap, Title } from '@/components/ui';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { giving } from '@/content/sample';

/**
 * Giving details with copy buttons. Payments are made in the M-Pesa or bank
 * app, which keeps the app within the App Store and Play Store donation rules.
 */
export default function Give() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async (key: string, value: string) => {
    await Clipboard.setStringAsync(value);
    setCopied(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2000);
  };

  const rows = [
    { key: 'mpesa', ...giving.mpesa },
    { key: 'bank', ...giving.bank },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="back" label="Back" variant="plain" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 24 }}>
        <View style={{ gap: 10 }}>
          <Eyebrow>{'Partnership & giving'}</Eyebrow>
          <Title size={40}>Help build the temple of God.</Title>
          <Body>Give by mobile money or bank transfer. Copy a number, then complete the payment in your M-Pesa or banking app.</Body>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Offering</Text>
          {rows.map((r) => (
            <View key={r.key} style={styles.row}>
              <Text style={styles.label}>{r.label}</Text>
              <Text style={styles.number} selectable numberOfLines={1} adjustsFontSizeToFit>
                {r.number}
              </Text>
              <View style={styles.rowFooter}>
                <Text style={styles.name}>{r.name}</Text>
                <Tap accessibilityRole="button" accessibilityLabel={`Copy ${r.label}`} onPress={() => copy(r.key, r.number)} style={styles.copy}>
                  <Icon name={copied === r.key ? 'check' : 'copy'} size={16} color={Colors.cream} />
                  <Text style={styles.copyText} accessibilityLiveRegion="polite">{copied === r.key ? 'Copied' : 'Copy'}</Text>
                </Tap>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.help}>
          <Eyebrow style={{ fontSize: 12 }}>Questions about giving?</Eyebrow>
          <Text style={styles.helpText}>+255 768 100 264 · info@btgministry.org</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  card: { padding: 22, borderRadius: Radius.lg, backgroundColor: Colors.brown, gap: 4 },
  cardTitle: { fontFamily: Fonts.display, fontSize: 32, color: Colors.cream, marginBottom: 8 },
  row: { gap: 6, paddingVertical: 18, borderTopWidth: 1, borderTopColor: '#8E6641' },
  rowFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { fontFamily: Fonts.sansSemiBold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: Colors.gold },
  number: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 36, letterSpacing: 1.2, color: Colors.cream, fontVariant: ['lining-nums', 'tabular-nums'] },
  name: { flex: 1, fontFamily: Fonts.sans, fontSize: 14, color: Colors.creamMuted },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  copyText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Colors.cream },
  help: { gap: 8, padding: 18, borderRadius: Radius.lg, backgroundColor: Colors.parchment, borderWidth: 1, borderColor: Colors.line },
  helpText: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: Colors.brownDark },
});
