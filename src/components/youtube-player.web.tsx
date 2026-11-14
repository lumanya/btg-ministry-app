import { StyleProp, View, ViewStyle } from 'react-native';



import { embedUrl } from './youtube-embed';
import { useColors } from '@/state/theme';

/** Web version of the player: a plain YouTube iframe. */
export function YouTubePlayer({ youtubeId, style }: { youtubeId: string; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[{ backgroundColor: c.night, overflow: 'hidden' }, style]}>
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
