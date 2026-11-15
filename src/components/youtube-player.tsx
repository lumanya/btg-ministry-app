import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { embedUrl } from './youtube-embed';
import { t } from '@/i18n';
import { keepPortrait, videoFullScreen } from '@/lib/orientation';
import { useColors } from '@/state/theme';

/**
 * Plays a YouTube video or livestream inside the app.
 *
 * YouTube requires embeds to identify the app that shows them, so the request
 * carries a Referer built from the app id. Without it YouTube shows
 * "Error 153: video player configuration error".
 */
const APP_REFERER = 'https://org.btgministry.app';

/**
 * Tells the app when the player's full-screen button is used, so the phone can turn
 * to landscape. Android uses the page's full-screen mode; iPhone opens its own video
 * player, which reports webkitbeginfullscreen / webkitendfullscreen on the video.
 */
const WATCH_FULL_SCREEN = `(function () {
  function send(full) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'fullscreen', full: full })); }
  function check() { send(!!(document.fullscreenElement || document.webkitFullscreenElement)); }
  document.addEventListener('fullscreenchange', check);
  document.addEventListener('webkitfullscreenchange', check);
  document.addEventListener('webkitbeginfullscreen', function () { send(true); }, true);
  document.addEventListener('webkitendfullscreen', function () { send(false); }, true);
})();
true;`;

export function YouTubePlayer({ youtubeId, start = 0, style }: { youtubeId: string; start?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const src = embedUrl(youtubeId, true, start);
  const full = useRef(false);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type?: string; full?: boolean };
      if (msg.type !== 'fullscreen' || msg.full === full.current) return;
      full.current = !!msg.full;
      if (full.current) videoFullScreen();
      else keepPortrait();
    } catch {
      // Not one of ours.
    }
  };

  // Leaving the screen while in full screen: turn the phone back upright.
  useEffect(
    () => () => {
      if (full.current) keepPortrait();
    },
    [],
  );
  return (
    <View style={[{ backgroundColor: c.night, overflow: 'hidden' }, style]}>
      <WebView
        source={{ uri: src, headers: { Referer: APP_REFERER } }}
        style={{ flex: 1, backgroundColor: c.night }}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        injectedJavaScript={WATCH_FULL_SCREEN}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={(req) => {
          // Frames inside the player (iOS reports these) and the embed itself load normally.
          if (req.isTopFrame === false || req.url.startsWith('https://www.youtube.com/embed/') || req.url === 'about:blank') {
            return true;
          }
          // Anything else, such as tapping the YouTube logo, opens in the browser.
          WebBrowser.openBrowserAsync(req.url);
          return false;
        }}
        accessibilityLabel={t('YouTube video player')}
      />
    </View>
  );
}
