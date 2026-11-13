import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eagle, SermonArt } from '@/components/art';
import { Icon, IconName } from '@/components/icon';
import { Body, Eyebrow, IconButton, Tap, Title } from '@/components/ui';
import { Colors, Fonts, Radius, ScreenPadding } from '@/constants/theme';
import { findSermon, links, sermons } from '@/content/sample';

export default function SermonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sermon = findSermon(id) ?? sermons[0];
  const [saved, setSaved] = useState(false);

  const url = sermon.youtubeId ? `https://www.youtube.com/watch?v=${sermon.youtubeId}` : links.youtubeChannel;
  // Opens on YouTube for now; the in-app YouTube player is added with the YouTube connection.
  const play = () => WebBrowser.openBrowserAsync(url);
  const upNext = sermons.filter((s) => s.id !== sermon.id).slice(0, 2);

  const actions: { icon: IconName; label: string; onPress: () => void; on?: boolean }[] = [
    { icon: 'bookmark', label: saved ? 'Saved' : 'Save', onPress: () => setSaved((s) => !s), on: saved },
    { icon: 'podcast', label: 'Listen', onPress: () => router.push('/player') },
    { icon: 'download', label: 'Download', onPress: () => {} },
    { icon: 'heart', label: 'Give', onPress: () => router.push('/give') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <IconButton icon="back" label="Back" variant="plain" iconSize={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/sermons'))} />
        <Eyebrow style={{ fontSize: 13 }}>{sermon.kind === 'sunday' ? 'Sunday service' : 'Teaching'}</Eyebrow>
        <IconButton icon="share" label="Share this sermon" variant="plain" onPress={() => Share.share({ message: `${sermon.title} — BTG Ministry ${url}` })} />
      </View>

      <Tap accessibilityRole="button" accessibilityLabel={`Play ${sermon.title}`} onPress={play}>
        <SermonArt title={sermon.title} tone="deep" height={220} titleSize={28} style={{ borderRadius: 0, backgroundColor: Colors.night, paddingHorizontal: 24 }}>
          <View style={styles.playDisc}>
            <Icon name="play" size={26} color={Colors.brown} />
          </View>
        </SermonArt>
      </Tap>

      <ScrollView contentContainerStyle={{ padding: ScreenPadding, paddingBottom: insets.bottom + 32, gap: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 8 }}>
          <Title size={32}>{sermon.title}</Title>
          <Text style={styles.meta}>{sermon.meta}</Text>
        </View>

        <View style={styles.speaker}>
          <View style={styles.avatar}>
            <Eagle height={34} />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={styles.speakerName}>Iman Mwakanyamale</Text>
            <Text style={styles.meta}>General Overseer</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {actions.map((a) => (
            <Tap
              key={a.icon}
              accessibilityRole="button"
              accessibilityState={a.on === undefined ? undefined : { selected: a.on }}
              onPress={a.onPress}
              style={[styles.action, a.on && { backgroundColor: Colors.brown, borderColor: Colors.brown }]}>
              <Icon name={a.icon} size={20} color={a.on ? Colors.cream : Colors.brownDark} filled={a.on} />
              <Text style={[styles.actionText, a.on && { color: Colors.cream }]}>{a.label}</Text>
            </Tap>
          ))}
        </View>

        <Body>{sermon.description}</Body>

        <View style={{ gap: 14 }}>
          <Eyebrow>Up next</Eyebrow>
          {upNext.map((s) => (
            <Tap
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`${s.title}, ${s.meta}`}
              onPress={() => router.replace({ pathname: '/sermon/[id]', params: { id: s.id } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <SermonArt title={s.shortTitle} tone={s.tone} height={72} titleSize={13} style={{ width: 124, borderRadius: 12, gap: 8 }} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.speakerName}>{s.title}</Text>
                <Text style={styles.meta}>{s.meta}</Text>
              </View>
            </Tap>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
  playDisc: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { fontFamily: Fonts.sans, fontSize: 14, color: Colors.textMuted },
  speaker: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: Colors.parchment },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.sand,
    borderWidth: 1,
    borderColor: Colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 3,
    overflow: 'hidden',
  },
  speakerName: { fontFamily: Fonts.sansSemiBold, fontSize: 15, color: Colors.text },
  action: {
    flex: 1,
    height: 68,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: { fontFamily: Fonts.sansSemiBold, fontSize: 12, color: Colors.brownDark },
});
