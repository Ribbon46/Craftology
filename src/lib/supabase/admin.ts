import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Service-role Supabase client (bypasses RLS). Server-only — used for admin /
// Stripe-Connect writes to columns users aren't allowed to set (status,
// stripe_account_id, …). Gated like the other integrations.
export function isServiceConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function createServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
