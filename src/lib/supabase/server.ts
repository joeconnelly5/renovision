// ============================================================
// RenoVision — Server-side Supabase Client
// Uses service role key for full DB access in API routes.
// No auth/cookies needed — single-user app.
// ============================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
