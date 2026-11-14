import * as WebBrowser from 'expo-web-browser';
import { StyleProp, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import { Colors } from '@/constants/theme';

import { embedUrl } from './youtube-embed';

/**
 * Plays a YouTube video or livestream inside the app.
 *
 * YouTube requires embeds to identify the app that shows them, so the request
 * carries a Referer built from the app id. Without it YouTube shows
 * "Error 153: video player configuration error".
 */
const APP_REFERER = 'https://org.btgministry.app';

export function YouTubePlayer({ youtubeId, style }: { youtubeId: string; style?: StyleProp<ViewStyle> }) {
  const src = embedUrl(youtubeId);
  return (
    <View style={[{ backgroundColor: Colors.night, overflow: 'hidden' }, style]}>
      <WebView
        source={{ uri: src, headers: { Referer: APP_REFERER } }}
        style={{ flex: 1, backgroundColor: Colors.night }}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(req) => {
          // Frames inside the player (iOS reports these) and the embed itself load normally.
          if (req.isTopFrame === false || req.url.startsWith('https://www.youtube.com/embed/') || req.url === 'about:blank') {
            return true;
          }
          // Anything else, such as tapping the YouTube logo, opens in the browser.
          WebBrowser.openBrowserAsync(req.url);
          return false;
        }}
        accessibilityLabel="YouTube video player"
      />
    </View>
  );
}
