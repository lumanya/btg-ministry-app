import { Alert, StyleSheet, Text } from 'react-native';

import { Icon } from '@/components/icon';
import { Tap } from '@/components/ui';
import { Fonts, Palette } from '@/constants/theme';
import { t } from '@/i18n';
import { success } from '@/lib/haptics';
import type { Episode } from '@/lib/podcast';
import { useDataSaver } from '@/state/data-saver';
import { cancelDownload, downloadEpisode, downloadsSupported, removeDownload, useDownloads } from '@/state/downloads';
import { useColors, useStyles } from '@/state/theme';

/** Download an episode to listen without internet; shows progress, and removes it again. */
export function DownloadButton({ episode }: { episode: Episode }) {
  const c = useColors();
  const styles = useStyles(createStyles);
  const { stateOf } = useDownloads();
  const { cellular } = useDataSaver();
  if (!downloadsSupported || !episode.audioUrl) return null;
  const state = stateOf(episode.id);

  const start = () => {
    downloadEpisode(episode)
      .then(() => success())
      .catch(() => Alert.alert(t('Download'), t('Couldn’t download this episode. Check your connection and try again.')));
  };

  const onPress = () => {
    if (state === 'saved') {
      Alert.alert(t('Remove download'), episode.title, [
        { text: t('Keep'), style: 'cancel' },
        { text: t('Remove'), style: 'destructive', onPress: () => removeDownload(episode.id) },
      ]);
    } else if (typeof state === 'number') {
      cancelDownload(episode.id);
    } else if (cellular) {
      Alert.alert(t('You’re on mobile data'), t('Downloading uses mobile data. Download now, or wait until you’re on Wi-Fi.'), [
        { text: t('Wait for Wi-Fi'), style: 'cancel' },
        { text: t('Download now'), onPress: start },
      ]);
    } else {
      start();
    }
  };

  const label =
    state === 'saved'
      ? t('Remove download')
      : typeof state === 'number'
        ? t('Downloading {percent}%. Tap to cancel', { percent: Math.round(state * 100) })
        : t('Download for offline listening');

  return (
    <Tap accessibilityRole="button" accessibilityLabel={`${label}: ${episode.title}`} onPress={onPress} style={styles.button}>
      {typeof state === 'number' ? (
        <Text style={styles.percent}>{Math.round(state * 100)}%</Text>
      ) : (
        <Icon name={state === 'saved' ? 'check' : 'download'} size={20} color={state === 'saved' ? c.accent : c.brownDark} />
      )}
    </Tap>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
    percent: { fontFamily: Fonts.sansBold, fontSize: 12, color: c.accent },
  });
