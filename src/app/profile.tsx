import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { Field, FormMessage } from '@/components/form';
import { Icon, IconName } from '@/components/icon';
import { Body, Button, Eyebrow, IconButton, Tap, Title } from '@/components/ui';
import { Fonts, Palette, Radius, ScreenPadding } from '@/constants/theme';
import { links } from '@/content/sample';
import { checkName } from '@/lib/auth-messages';
import { goHome } from '@/lib/navigation';
import { useAuth } from '@/state/auth';
import { DataSaverPreference, useDataSaver } from '@/state/data-saver';
import { LanguagePreference, useLanguage } from '@/state/language';
import { useLibrary } from '@/state/library';
import { TOPICS, useNotifications } from '@/state/notifications';
import { ThemePreference, useColors, useStyles, useTheme } from '@/state/theme';

const LANGUAGES: { id: LanguagePreference; label: string }[] = [
  { id: 'system', label: 'Phone' },
  { id: 'en', label: 'English' },
  { id: 'sw', label: 'Kiswahili' },
];

const DATA_SAVER: { id: DataSaverPreference; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'on', label: 'On' },
  { id: 'off', label: 'Off' },
];

const THEMES: { id: ThemePreference; label: string; icon: IconName }[] = [
  { id: 'system', label: 'Phone', icon: 'monitor' },
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
];

export default function Profile() {
  const router = useRouter();
  const lib = useLibrary();
  const language = useLanguage();
  const saver = useDataSaver();
  const notify = useNotifications();
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const savedCount = lib.savedVideos.length + lib.savedDevotionals.length;
  const savedLabel = savedCount ? (savedCount === 1 ? t('Saved · 1 item') : t('Saved · {n} items', { n: savedCount })) : t('Saved sermons and devotionals');
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
      setMessage({ tone: 'info', text: t('Your name is saved.') });
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
        <IconButton icon="back" label={t('Back')} variant="plain" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: ScreenPadding, paddingBottom: insets.bottom + 40, gap: 28 }} showsVerticalScrollIndicator={false}>
        <Title size={36}>{signedIn ? t('Your account') : t('Settings')}</Title>

        {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}

        {/* Account */}
        {signedIn ? (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{auth.name ?? t('BTG member')}</Text>
                <Text style={styles.meta}>{auth.email}</Text>
              </View>
            </View>
            {editing ? (
              <View style={{ gap: 12 }}>
                <Field label={t('Your name')} value={name} onChangeText={setName} error={nameError} autoCapitalize="words" autoComplete="name" />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button label={busy ? t('Saving…') : t('Save')} onPress={busy ? undefined : saveName} style={{ flex: 1 }} />
                  <Button label={t('Cancel')} variant="outline" onPress={() => setEditing(false)} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <Row icon="user" label={t('Change your name')} onPress={() => setEditing(true)} />
            )}
            <Row icon="logout" label={t('Sign out')} onPress={signOut} />
          </View>
        ) : (
          <View style={styles.card}>
            <View style={{ gap: 6 }}>
              <Text style={styles.name}>{t('You’re using the app as a guest.')}</Text>
              <Body>{t('Create a free account to keep your reading streak, saved sermons and prayer requests on every phone.')}</Body>
            </View>
            <View style={{ gap: 6 }}>
              <Button label={t('Create an account')} onPress={() => router.push('/sign-up')} />
              <Button label={t('Sign in')} variant="outline" onPress={() => router.push('/sign-in')} />
            </View>
          </View>
        )}

        {/* Language */}
        <View style={{ gap: 12 }}>
          <Eyebrow>{t('Language')}</Eyebrow>
          <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={t('App language')}>
            {LANGUAGES.map((opt) => {
              const on = language.preference === opt.id;
              return (
                <Tap
                  key={opt.id}
                  haptic="tick"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => language.setPreference(opt.id)}
                  style={[styles.segmentItem, on && styles.segmentOn]}>
                  <Text style={[styles.segmentText, on && { color: c.cream }]}>{t(opt.label)}</Text>
                </Tap>
              );
            })}
          </View>
          <Text style={styles.meta}>{t('“Phone” uses your phone’s language when it’s English or Kiswahili.')}</Text>
        </View>

        {/* Appearance */}
        <View style={{ gap: 12 }}>
          <Eyebrow>{t('Appearance')}</Eyebrow>
          <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={t('Appearance')}>
            {THEMES.map((opt) => {
              const on = theme.preference === opt.id;
              return (
                <Tap
                  key={opt.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={opt.id === 'system' ? t('Match the phone') : t('{mode} mode', { mode: t(opt.label) })}
                  onPress={() => theme.setPreference(opt.id)}
                  style={[styles.segmentItem, on && styles.segmentOn]}>
                  <Icon name={opt.icon} size={18} color={on ? c.cream : c.brownDark} />
                  <Text style={[styles.segmentText, on && { color: c.cream }]}>{t(opt.label)}</Text>
                </Tap>
              );
            })}
          </View>
          <Text style={styles.meta}>{t('“Phone” follows your phone’s light or dark setting.')}</Text>
        </View>

        {/* Data saver */}
        <View style={{ gap: 12 }}>
          <Eyebrow>{t('Data saver')}</Eyebrow>
          <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={t('Use less mobile data')}>
            {DATA_SAVER.map((opt) => {
              const on = saver.preference === opt.id;
              return (
                <Tap
                  key={opt.id}
                  haptic="tick"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => saver.setPreference(opt.id)}
                  style={[styles.segmentItem, on && styles.segmentOn]}>
                  <Text style={[styles.segmentText, on && { color: c.cream }]}>{t(opt.label)}</Text>
                </Tap>
              );
            })}
          </View>
          <Text style={styles.meta}>
            {saver.active ? t('Data saver is on: smaller pictures, fewer refreshes.') : t('“Auto” saves data on mobile data and uses full quality on Wi-Fi.')}
          </Text>
        </View>

        {/* Notifications */}
        <View style={{ gap: 4 }}>
          <Eyebrow style={{ marginBottom: 6 }}>{t('Notifications')}</Eyebrow>
          {notify.unsupported ? (
            <Text style={styles.meta}>{notify.unsupported}</Text>
          ) : (
            <>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.switchLabel}>{t('Allow notifications')}</Text>
                  <Text style={styles.meta}>{t('Choose what you’d like to hear about.')}</Text>
                </View>
                <Switch
                  accessibilityLabel={t('Allow notifications')}
                  value={notify.enabled}
                  disabled={notify.busy}
                  onValueChange={async (on) => {
                    setNotifyError(null);
                    if (on) {
                      const res = await notify.enable();
                      if (!res.ok) setNotifyError(res.error);
                    } else notify.disable();
                  }}
                  trackColor={{ false: c.rail, true: c.brown }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {notifyError ? <FormMessage>{notifyError}</FormMessage> : null}
              {notify.enabled
                ? TOPICS.map((topic) => (
                    <View key={topic.id} style={styles.switchRow}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.switchLabel}>{t(topic.label)}</Text>
                        <Text style={styles.meta}>{t(topic.hint)}</Text>
                      </View>
                      <Switch
                        accessibilityLabel={t(topic.label)}
                        value={notify.topics.includes(topic.id)}
                        onValueChange={(on) => notify.setTopic(topic.id, on)}
                        trackColor={{ false: c.rail, true: c.brown }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  ))
                : null}
            </>
          )}
        </View>

        {/* Library */}
        <View style={{ gap: 4 }}>
          <Eyebrow style={{ marginBottom: 6 }}>{t('Your library')}</Eyebrow>
          <Row icon="bookmark" label={savedLabel} onPress={() => router.push('/saved')} />
          <Row icon="calendar" label={t('Events')} onPress={() => router.push('/events')} />
          <Row icon="flame" label={lib.streak ? t('{n}-day reading streak · best {best}', { n: lib.streak, best: lib.bestStreak }) : t('Start a reading streak')} onPress={() => router.navigate('/devotional')} />
        </View>

        {/* About */}
        <View style={{ gap: 4 }}>
          <Eyebrow style={{ marginBottom: 6 }}>{t('About')}</Eyebrow>
          <Row icon="globe" label="btgministry.org" onPress={() => WebBrowser.openBrowserAsync(links.website)} />
          <Row icon="heart" label={t('Give to the ministry')} onPress={() => router.push('/give')} />
          <Text style={[styles.meta, { paddingTop: 10 }]}>{t('BTG Ministry app · version {version}', { version: Constants.expoConfig?.version ?? '1.0.0' })}</Text>
        </View>

        {/* Delete account: required by the App Store for apps that offer sign-up. */}
        {signedIn ? (
          <View style={{ gap: 12 }}>
            <Eyebrow>{t('Delete account')}</Eyebrow>
            {confirmDelete ? (
              <View style={[styles.card, { borderColor: c.danger }]}>
                <Text style={styles.name}>{t('Delete your account?')}</Text>
                <Body>{t('This removes your account and everything saved with it. It can’t be undone.')}</Body>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Tap accessibilityRole="button" onPress={busy ? undefined : deleteAccount} style={[styles.dangerButton, { flex: 1 }]}>
                    <Text style={styles.dangerText}>{busy ? t('Deleting…') : t('Yes, delete')}</Text>
                  </Tap>
                  <Button label={t('Keep it')} variant="outline" onPress={() => setConfirmDelete(false)} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <Row icon="trash" label={t('Delete my account')} danger onPress={() => setConfirmDelete(true)} />
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
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line },
    switchLabel: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: c.text },
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
