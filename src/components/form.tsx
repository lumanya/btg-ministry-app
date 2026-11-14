import { useRouter } from 'expo-router';
import { ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eagle } from '@/components/art';
import { Icon } from '@/components/icon';
import { Body, IconButton, Tap, Title } from '@/components/ui';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { useColors, useStyles } from '@/state/theme';

/** A labelled text input with an error line underneath. */
export function Field({
  label,
  error,
  secure = false,
  hint,
  ...input
}: TextInputProps & { label: string; error?: string | null; secure?: boolean; hint?: string }) {
  const c = useColors();
  const styles = useStyles(createStyles);
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && { borderColor: c.accent, borderWidth: 2 }, !!error && { borderColor: c.danger }]}>
        <TextInput
          {...input}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          secureTextEntry={secure && hidden}
          placeholderTextColor={c.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={styles.input}
        />
        {secure ? (
          <IconButton
            icon={hidden ? 'eye' : 'eyeOff'}
            label={hidden ? 'Show password' : 'Hide password'}
            variant="plain"
            iconSize={20}
            onPress={() => setHidden((h) => !h)}
          />
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

/** A message box above or below a form: errors in red, notes in the brand colour. */
export function FormMessage({ tone = 'error', children }: { tone?: 'error' | 'info'; children: ReactNode }) {
  const c = useColors();
  const styles = useStyles(createStyles);
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[styles.message, tone === 'error' ? { borderColor: c.danger } : { borderColor: c.lineStrong, backgroundColor: c.parchment }]}>
      <Text style={[styles.messageText, tone === 'error' && { color: c.text }]}>{children}</Text>
    </View>
  );
}

/** Layout for the account screens: back button, emblem, title, then the form. */
export function AuthScreen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useStyles(createStyles);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="back" label="Back" variant="plain" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: ScreenPadding + 4, paddingBottom: insets.bottom + 32, gap: 24 }}>
        <View style={{ gap: 14 }}>
          <Eagle height={52} />
          <Title size={38}>{title}</Title>
          {subtitle ? <Body style={{ fontSize: 16 }}>{subtitle}</Body> : null}
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** A small text link such as "Forgot your password?". */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles(createStyles);
  return (
    <Tap accessibilityRole="link" onPress={onPress} style={styles.link}>
      <Text style={styles.linkText}>{label}</Text>
      <Icon name="chevron" size={16} />
    </Tap>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.ivory },
    topBar: { paddingHorizontal: 12, paddingBottom: 4 },
    label: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.text },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 54,
      paddingLeft: 16,
      paddingRight: 4,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.white,
    },
    input: { flex: 1, minHeight: 52, fontFamily: Fonts.sans, fontSize: 16, color: c.text },
    error: { fontFamily: Fonts.sansMedium, fontSize: 13, lineHeight: 18, color: c.danger },
    hint: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, color: c.textMuted },
    message: { padding: 14, borderRadius: Radius.md, borderWidth: 1, backgroundColor: c.white },
    messageText: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: c.textMuted },
    link: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
    linkText: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: c.accent },
  });
