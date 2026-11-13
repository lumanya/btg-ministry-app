import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { Eagle } from '@/components/art';
import { Icon, IconName } from '@/components/icon';
import { Body, Button, IconButton, LiveBadge, Screen, Tap, Title } from '@/components/ui';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { links, services } from '@/content/sample';

type Panel = 'upcoming' | 'prayer';

export default function Live() {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>('upcoming');
  const [reminders, setReminders] = useState<Record<string, boolean>>({});
  const [prayer, setPrayer] = useState('');
  const [sent, setSent] = useState(false);

  // Until the YouTube connection is built, the stream opens on YouTube.
  const watch = () => WebBrowser.openBrowserAsync(links.youtubeStreams);
  const anyReminder = Object.values(reminders).some(Boolean);

  const actions: { icon: IconName; label: string; onPress: () => void; primary?: boolean }[] = [
    { icon: 'chat', label: 'Prayer', onPress: () => setPanel('prayer') },
    { icon: 'heart', label: 'Give', onPress: () => router.push('/give'), primary: true },
    { icon: 'podcast', label: 'Audio only', onPress: watch },
  ];

  return (
    <Screen gap={20}>
      <View style={styles.header}>
        <Title>Live</Title>
        <IconButton
          icon="share"
          label="Share the livestream"
          iconSize={18}
          onPress={() => Share.share({ message: `Join the BTG Ministry livestream: ${links.youtubeStreams}` })}
        />
      </View>

      <Tap accessibilityRole="button" accessibilityLabel="Watch the livestream" onPress={watch} style={styles.player}>
        <View style={styles.watermark}>
          <Eagle height={164} light />
        </View>
        <View style={{ position: 'absolute', top: 12, left: 12 }}>
          <LiveBadge />
        </View>
        <View style={styles.playDisc}>
          <Icon name="play" size={26} color={Colors.brown} />
        </View>
        <View style={styles.controls}>
          <View style={styles.liveLine} />
          <Text style={styles.controlText}>Live</Text>
          <Icon name="expand" size={18} color={Colors.cream} />
        </View>
      </Tap>

      <View style={{ gap: 8 }}>
        <Title size={32}>Sunday Service</Title>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.avatar}>
            <Eagle height={26} />
          </View>
          <Text style={styles.meta}>
            <Text style={{ fontFamily: Fonts.sansSemiBold, color: Colors.text }}>Iman Mwakanyamale</Text> · Streaming now
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {actions.map((a) => (
          <Tap
            key={a.label}
            accessibilityRole="button"
            onPress={a.onPress}
            style={[styles.action, a.primary && { backgroundColor: Colors.brown, borderColor: Colors.brown }]}>
            <Icon name={a.icon} size={20} color={a.primary ? Colors.cream : Colors.brownDark} />
            <Text style={[styles.actionText, a.primary && { color: Colors.cream }]}>{a.label}</Text>
          </Tap>
        ))}
      </View>

      <View style={styles.segment} accessibilityRole="tablist">
        {(['upcoming', 'prayer'] as Panel[]).map((p) => {
          const on = panel === p;
          return (
            <Tap
              key={p}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setPanel(p)}
              style={[styles.segmentItem, on && styles.segmentOn]}>
              <Text style={[styles.segmentText, on && { color: Colors.cream }]}>{p === 'upcoming' ? 'Coming up' : 'Prayer request'}</Text>
            </Tap>
          );
        })}
      </View>

      {panel === 'upcoming' ? (
        <View style={{ gap: 10 }}>
          {services.map((s) => {
            const on = !!reminders[s.id];
            return (
              <View key={s.id} style={styles.service}>
                <View style={styles.dayBox}>
                  <Text style={styles.dayText}>{s.day}</Text>
                  <Text style={styles.timeText}>{s.time}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.serviceName}>{s.name}</Text>
                  <Text style={styles.meta}>{s.meta}</Text>
                </View>
                <IconButton
                  icon="bell"
                  filled={on}
                  selected={on}
                  variant={on ? 'solid' : 'outline'}
                  label={on ? `Turn off the reminder for ${s.name}` : `Remind me about ${s.name}`}
                  iconSize={18}
                  onPress={() => setReminders((r) => ({ ...r, [s.id]: !on }))}
                  style={!on ? { borderColor: Colors.brown, backgroundColor: 'transparent' } : undefined}
                />
              </View>
            );
          })}
          <Text style={styles.meta} accessibilityLiveRegion="polite">
            {anyReminder ? 'We will notify you when the stream starts.' : ' '}
          </Text>
        </View>
      ) : (
        <View style={styles.prayerCard}>
          {sent ? (
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }} accessibilityLiveRegion="polite">
              <View style={styles.checkDisc}>
                <Icon name="check" color={Colors.cream} />
              </View>
              <Title size={26} style={{ textAlign: 'center' }}>Your request is with us.</Title>
              <Body style={{ textAlign: 'center' }}>We are standing with you in prayer.</Body>
              <Button
                label="Send another"
                variant="outline"
                onPress={() => {
                  setPrayer('');
                  setSent(false);
                }}
                style={{ minHeight: 44 }}
              />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Text style={styles.label} nativeID="prayerLabel">
                Your prayer request
              </Text>
              <TextInput
                value={prayer}
                onChangeText={setPrayer}
                multiline
                accessibilityLabelledBy="prayerLabel"
                accessibilityLabel="Your prayer request"
                placeholder="Share what you would like the ministry to pray for"
                placeholderTextColor={Colors.textSubtle}
                style={styles.textArea}
              />
              <Button label="Send to the prayer team" onPress={() => prayer.trim() && setSent(true)} />
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  player: { height: 200, borderRadius: 18, backgroundColor: Colors.night, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  watermark: { position: 'absolute', opacity: 0.16 },
  playDisc: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.cream, alignItems: 'center', justifyContent: 'center' },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(31,19,10,0.55)',
  },
  liveLine: { flex: 1, height: 3, borderRadius: 2, backgroundColor: Colors.live },
  controlText: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: Colors.cream },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.sand, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2, overflow: 'hidden' },
  meta: { fontFamily: Fonts.sans, fontSize: 14, color: Colors.textMuted },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    height: 72,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: { fontFamily: Fonts.sansSemiBold, fontSize: 13, color: Colors.brownDark },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: Radius.pill, backgroundColor: Colors.parchment, borderWidth: 1, borderColor: Colors.line },
  segmentItem: { flex: 1, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: Colors.brown },
  segmentText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Colors.brownDark },
  service: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    paddingLeft: 16,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  dayBox: { width: 56, height: 56, borderRadius: 14, backgroundColor: Colors.parchment, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontFamily: Fonts.sansBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: Colors.eyebrow },
  timeText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.text },
  serviceName: { fontFamily: Fonts.sansSemiBold, fontSize: 16, color: Colors.text },
  prayerCard: { padding: 18, borderRadius: 18, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.line },
  label: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: '#3A2413' },
  textArea: {
    minHeight: 112,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.ivory,
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  checkDisc: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.brown, alignItems: 'center', justifyContent: 'center' },
});
