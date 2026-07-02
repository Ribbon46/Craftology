import { type EmailOtpType } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '@/lib/supabase/config';

// Email-confirmation landing. The "Confirm signup" email links here with a
// one-time token_hash; we verify it server-side (works across devices) which
// establishes the session, then redirect the user into the app ALREADY LOGGED
// IN. The session cookies are written onto the redirect response directly —
// setting them via next/headers cookies() does not reliably survive a
// NextResponse.redirect(), which was leaving users signed out after confirming.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextParam = searchParams.get('next') ?? '/';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  if (token_hash && type && isSupabaseConfigured()) {
    const response = NextResponse.redirect(new URL(next, origin));
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return response;
  }

  // Invalid / expired link — send home with a flag the UI can surface.
  return NextResponse.redirect(new URL('/?auth=confirmare_esuata', origin));
}
