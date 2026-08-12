import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// DANGER: this client uses the service_role key and bypasses every RLS
// policy. Import it ONLY inside app/api/** route handlers that run
// server-side, and ONLY for operations that genuinely need to cross a
// student/admin boundary in a controlled way (e.g. server-side exam
// scoring writing a leaderboard entry, or the one-time admin bootstrap).
//
// Never import this into a Client Component, never send its result of a
// query straight back to the client without filtering fields yourself, and
// never let a request body decide which row it touches without checking
// the authenticated user's own session first via lib/supabase/server.ts.
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — server misconfigured.');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
