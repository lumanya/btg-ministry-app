import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * The Supabase client used for accounts.
 *
 * Set in `.env` (both are safe to ship in the app):
 *   EXPO_PUBLIC_SUPABASE_URL   https://<your-project-ref>.supabase.co
 *   EXPO_PUBLIC_SUPABASE_KEY   the project's publishable (anon) key
 *
 * Without them `supabase` is null and the app runs in guest-only mode.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// Refresh the sign-in token only while the app is open, as Supabase recommends for mobile.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
