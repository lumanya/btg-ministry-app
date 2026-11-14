import * as ScreenOrientation from 'expo-screen-orientation';
import { setStatusBarHidden } from 'expo-status-bar';
import { Platform } from 'react-native';

/**
 * The app stays upright; only a video in full screen turns sideways, the way the
 * YouTube app does. (app.json allows landscape so this switch is possible.)
 */
const native = Platform.OS === 'ios' || Platform.OS === 'android';

export function keepPortrait() {
  if (!native) return;
  setStatusBarHidden(false, 'fade');
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
}

export function videoFullScreen() {
  if (!native) return;
  setStatusBarHidden(true, 'fade');
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
}
