import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

// Email-confirmation landing. The "Confirm signup" email links here with a
// one-time token_hash; we verify it server-side (works across devices, unlike
// the PKCE code flow which needs the originating browser), which sets the
// session cookie, then redirect the user into the app already logged in.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextParam = searchParams.get('next') ?? '/';
  // Only allow same-site relative redirects (block open-redirect via ?next=).
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  if (token_hash && type && isSupabaseConfigured()) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // Invalid / expired link — send home with a flag the UI can surface.
  return NextResponse.redirect(new URL('/?auth=confirmare_esuata', origin));
}
