import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '@/lib/supabase/config';
import { createMockClient } from '@/lib/supabase/mock-client';

/**
 * Server-side Supabase client (used by Server Actions). Mirrors the browser
 * client's graceful degradation: with placeholder/missing credentials it
 * returns a safe mock so server actions return clean "not configured" results
 * instead of crashing on an invalid URL. Standard @supabase/ssr cookie handling
 * is used (no forced `__Secure-` name / secure flag, which would break sessions
 * over http://localhost during development).
 */
export async function createServerClient() {
  if (!isSupabaseConfigured()) {
    return createMockClient();
  }

  const cookieStore = await cookies();

  return createSSRClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // setAll can be called from a Server Component where cookies are
          // read-only — safe to ignore; middleware refreshes the session.
        }
      },
    },
  });
}
