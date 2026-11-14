import { StyleProp, View, ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';

import { embedUrl } from './youtube-embed';

/** Web version of the player: a plain YouTube iframe. */
export function YouTubePlayer({ youtubeId, style }: { youtubeId: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: Colors.night, overflow: 'hidden' }, style]}>
      <iframe
        title="YouTube video player"
        src={embedUrl(youtubeId)}
        style={{ border: 0, width: '100%', height: '100%' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </View>
  );
}
