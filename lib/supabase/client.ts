'use client';

import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser Supabase client used by the PWA/Android web app.
 * The SSR browser client keeps the auth session in sync with cookies so
 * Next.js middleware can restore the authenticated user after app restarts.
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
        storageKey: 'pinnacle-tutors-auth',
      },
    }
  );

  return client;
}
