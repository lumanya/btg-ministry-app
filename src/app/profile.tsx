import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Field, FormMessage } from '@/components/form';
import { Icon, IconName } from '@/components/icon';
import { Body, Button, Eyebrow, IconButton, Tap, Title } from '@/components/ui';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { links } from '@/content/sample';
import { checkName } from '@/lib/auth-messages';
import { goHome } from '@/lib/navigation';
import { useAuth } from '@/state/auth';
import { useLibrary } from '@/state/library';
import { ThemePreference, useColors, useStyles, useTheme } from '@/state/theme';

const THEMES: { id: ThemePreference; label: string; icon: IconName }[] = [
  { id: 'system', label: 'Phone', icon: 'monitor' },
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
];

export default function Profile() {
  const router = useRouter();
  const lib = useLibrary();
  const savedCount = lib.savedVideos.length + lib.savedDevotionals.length;
  const savedLabel = savedCount ? `Saved · ${savedCount} ${savedCount === 1 ? 'item' : 'items'}` : 'Saved sermons and devotionals';
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles(createStyles);
  const theme = useTheme();
  const auth = useAuth();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(auth.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const signedIn = !!auth.session;
  const initial = (auth.name ?? auth.email ?? '?').trim().charAt(0).toUpperCase();

  const saveName = async () => {
    const problem = checkName(name);
    setNameError(problem);
    if (problem) return;
    setBusy(true);
    const res = await auth.updateName(name);
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      setMessage({ tone: 'info', text: 'Your name is saved.' });
    } else setMessage({ tone: 'error', text: res.error });
  };

  const signOut = async () => {
    await auth.signOut();
    goHome(router);
  };

  const deleteAccount = async () => {
    setBusy(true);
    const res = await auth.deleteAccount();
    setBusy(false);
    if (res.ok) goHome(router);
    else setMessage({ tone: 'error', text: res.error });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ivory }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="back" label="Back" variant="plain" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: ScreenPadding, paddingBottom: insets.bottom + 40, gap: 28 }} showsVerticalScrollIndicator={false}>
        <Title size={36}>{signedIn ? 'Your account' : 'Settings'}</Title>

        {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}

        {/* Account */}
        {signedIn ? (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{auth.name ?? 'BTG member'}</Text>
                <Text style={styles.meta}>{auth.email}</Text>
              </View>
            </View>
            {editing ? (
              <View style={{ gap: 12 }}>
                <Field label="Your name" value={name} onChangeText={setName} error={nameError} autoCapitalize="words" autoComplete="name" />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button label={busy ? 'Saving…' : 'Save'} onPress={busy ? undefined : saveName} style={{ flex: 1 }} />
                  <Button label="Cancel" variant="outline" onPress={() => setEditing(false)} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <Row icon="user" label="Change your name" onPress={() => setEditing(true)} />
            )}
            <Row icon="logout" label="Sign out" onPress={signOut} />
          </View>
        ) : (
          <View style={styles.card}>
            <View style={{ gap: 6 }}>
              <Text style={styles.name}>You’re using the app as a guest.</Text>
              <Body>Create a free account to keep your reading streak, saved sermons and prayer requests on every phone.</Body>
            </View>
            <View style={{ gap: 6 }}>
              <Button label="Create an account" onPress={() => router.push('/sign-up')} />
              <Button label="Sign in" variant="outline" onPress={() => router.push('/sign-in')} />
            </View>
          </View>
        )}

        {/* Appearance */}
        <View style={{ gap: 12 }}>
          <Eyebrow>Appearance</Eyebrow>
          <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel="Appearance">
            {THEMES.map((t) => {
              const on = theme.preference === t.id;
              return (
                <Tap
                  key={t.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={t.id === 'system' ? 'Match the phone' : `${t.label} mode`}
                  onPress={() => theme.setPreference(t.id)}
                  style={[styles.segmentItem, on && styles.segmentOn]}>
                  <Icon name={t.icon} size={18} color={on ? c.cream : c.brownDark} />
                  <Text style={[styles.segmentText, on && { color: c.cream }]}>{t.label}</Text>
                </Tap>
              );
            })}
          </View>
          <Text style={styles.meta}>“Phone” follows your phone’s light or dark setting.</Text>
        </View>

        {/* Library */}
        <View style={{ gap: 4 }}>
          <Eyebrow style={{ marginBottom: 6 }}>Your library</Eyebrow>
          <Row icon="bookmark" label={savedLabel} onPress={() => router.push('/saved')} />
          <Row icon="flame" label={lib.streak ? `${lib.streak}-day reading streak · best ${lib.bestStreak}` : 'Start a reading streak'} onPress={() => router.navigate('/devotional')} />
        </View>

        {/* About */}
        <View style={{ gap: 4 }}>
          <Eyebrow style={{ marginBottom: 6 }}>About</Eyebrow>
          <Row icon="globe" label="btgministry.org" onPress={() => WebBrowser.openBrowserAsync(links.website)} />
          <Row icon="heart" label="Give to the ministry" onPress={() => router.push('/give')} />
          <Text style={[styles.meta, { paddingTop: 10 }]}>BTG Ministry app · version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>

        {/* Delete account: required by the App Store for apps that offer sign-up. */}
        {signedIn ? (
          <View style={{ gap: 12 }}>
            <Eyebrow>Delete account</Eyebrow>
            {confirmDelete ? (
              <View style={[styles.card, { borderColor: c.danger }]}>
                <Text style={styles.name}>Delete your account?</Text>
                <Body>This removes your account and everything saved with it. It can’t be undone.</Body>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Tap accessibilityRole="button" onPress={busy ? undefined : deleteAccount} style={[styles.dangerButton, { flex: 1 }]}>
                    <Text style={styles.dangerText}>{busy ? 'Deleting…' : 'Yes, delete'}</Text>
                  </Tap>
                  <Button label="Keep it" variant="outline" onPress={() => setConfirmDelete(false)} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <Row icon="trash" label="Delete my account" danger onPress={() => setConfirmDelete(true)} />
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, onPress, danger = false }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const c = useColors();
  const styles = useStyles(createStyles);
  return (
    <Tap accessibilityRole="button" onPress={onPress} style={styles.row}>
      <Icon name={icon} size={20} color={danger ? c.danger : c.accent} />
      <Text style={[styles.rowText, danger && { color: c.danger }]}>{label}</Text>
      <Icon name="chevron" size={16} color={c.textSubtle} />
    </Tap>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    topBar: { paddingHorizontal: 12, paddingBottom: 4 },
    card: { gap: 16, padding: 18, borderRadius: Radius.lg, backgroundColor: c.white, borderWidth: 1, borderColor: c.line },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.brown, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: Fonts.display, fontSize: 26, color: c.cream },
    name: { fontFamily: Fonts.sansSemiBold, fontSize: 17, color: c.text },
    meta: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: c.textMuted },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, borderBottomWidth: 1, borderBottomColor: c.line },
    rowText: { flex: 1, fontFamily: Fonts.sansSemiBold, fontSize: 15, color: c.text },
    segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: Radius.pill, backgroundColor: c.parchment, borderWidth: 1, borderColor: c.line },
    segmentItem: { flex: 1, flexDirection: 'row', gap: 6, height: 46, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
    segmentOn: { backgroundColor: c.brown },
    segmentText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: c.brownDark },
    dangerButton: { minHeight: 52, borderRadius: Radius.pill, backgroundColor: c.live, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    dangerText: { fontFamily: Fonts.sansSemiBold, fontSize: 16, color: '#FFFFFF' },
  });
