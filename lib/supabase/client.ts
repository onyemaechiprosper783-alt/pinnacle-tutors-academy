import { createBrowserClient } from '@supabase/ssr';
import { Preferences } from '@capacitor/preferences';

let client: ReturnType<typeof createBrowserClient> | null = null;

const NATIVE_STORAGE_PREFIX = 'pta-supabase-';

const persistentStorage = {
  async getItem(key: string) {
    try {
      const { value } = await Preferences.get({ key: `${NATIVE_STORAGE_PREFIX}${key}` });
      if (value !== null && value !== undefined) return value;
    } catch (error) {
      console.warn('Native auth storage read failed:', error);
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      await Preferences.set({ key: `${NATIVE_STORAGE_PREFIX}${key}`, value });
    } catch (error) {
      console.warn('Native auth storage write failed:', error);
    }
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Native Preferences is the primary persistent store on Android.
    }
  },
  async removeItem(key: string) {
    try {
      await Preferences.remove({ key: `${NATIVE_STORAGE_PREFIX}${key}` });
    } catch (error) {
      console.warn('Native auth storage remove failed:', error);
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore local fallback failures.
    }
  },
};

/**
 * Browser Supabase client for the Android/PWA app.
 *
 * The Android build uses Capacitor Preferences as a durable native backup
 * for the Supabase session, while localStorage remains as a browser fallback.
 * This prevents the Android WebView from losing the student's session when
 * the app process is closed and later reopened.
 */
export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: persistentStorage,
      },
    }
  );

  return client;
}
