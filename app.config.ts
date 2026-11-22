import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json is the app's settings. This only adds one thing for the web test link:
 * when EXPO_WEB_BASE_URL is set (the GitHub Pages build), the web app is served
 * from that folder, e.g. /btg-ministry-app/app. Phone builds never set it.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const baseUrl = process.env.EXPO_WEB_BASE_URL;
  return {
    ...(config as ExpoConfig),
    experiments: { ...config.experiments, ...(baseUrl ? { baseUrl } : {}) },
  };
};
