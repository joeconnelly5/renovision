// ============================================================
// RenoVision — Browser-side Supabase Client
// Uses @supabase/ssr for Next.js client components
// ============================================================

import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';

export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Alias for backward compatibility
export const createClient = createBrowserClient;
