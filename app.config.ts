import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json is the app's settings. This only adds one thing for the web test link:
 * when EXPO_WEB_BASE_URL is set, the web app is served from that folder (the live
 * site, app.btgministry.org, serves it at the root and leaves it unset).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const baseUrl = process.env.EXPO_WEB_BASE_URL;
  return {
    ...(config as ExpoConfig),
    experiments: { ...config.experiments, ...(baseUrl ? { baseUrl } : {}) },
  };
};
