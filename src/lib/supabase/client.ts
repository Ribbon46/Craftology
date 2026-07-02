'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '@/lib/supabase/config';
import { createMockClient } from '@/lib/supabase/mock-client';

/**
 * Browser Supabase client. Returns a real client only when valid credentials
 * are present; otherwise a safe mock so the app runs as a demo without crashing
 * (placeholder env values like "your-supabase-project-url" are truthy but
 * invalid, so a presence-only check is not enough — see isSupabaseConfigured).
 * Typed as a real client so call sites stay type-safe; the mock satisfies the
 * subset of the API the app actually uses.
 */
// Memoized singleton: every caller shares ONE browser client. Creating a new
// client per call (per useSession mount, per fetch) spins up multiple auth
// listeners + token-refresh timers that race on refresh-token rotation and can
// intermittently sign the user out on navigation. One instance avoids that and
// makes a second sign-in propagate to every consumer via onAuthStateChange.
let browserClient: SupabaseClient<Database> | null = null;

export const createClient = (): SupabaseClient<Database> => {
  if (!isSupabaseConfigured()) {
    return createMockClient() as unknown as SupabaseClient<Database>;
  }
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
};
