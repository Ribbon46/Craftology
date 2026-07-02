'use server';

import { headers } from 'next/headers';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient, isServiceConfigured } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

function origin(h: Headers) {
  return h.get('origin') ?? (h.get('host') ? `https://${h.get('host')}` : 'https://craftology-peach.vercel.app');
}

/**
 * Creates (once) a Stripe Connect Express account for the current approved
 * seller and returns a hosted onboarding Account Link. The seller is the
 * merchant of record (direct charges); the platform later takes a 10% fee.
 */
export async function createSellerOnboardingLink() {
  if (!isStripeConfigured() || !stripe) return { error: 'Plățile nu sunt configurate momentan.' };
  if (!isServiceConfigured()) return { error: 'Configurare incompletă (service role).' };

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Autentificare necesară' };

  // Read the seller via the service client (stripe_account_id isn't user-readable).
  const svc = createServiceClient();
  const { data: seller } = await svc
    .from('sellers')
    .select('id, status, stripe_account_id, contact_email, company_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!seller) return { error: 'Nu ești înregistrat ca vânzător.' };
  if (seller.status !== 'approved') return { error: 'Contul de vânzător nu este aprobat încă.' };

  try {
    let accountId: string | null = seller.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'RO',
        email: seller.contact_email ?? user.email ?? undefined,
        business_type: 'company', // persoană juridică — required to invoice
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { seller_id: seller.id, company: seller.company_name ?? '' },
      });
      accountId = account.id;
      await svc.from('sellers').update({ stripe_account_id: accountId, updated_at: new Date().toISOString() }).eq('id', seller.id);
    }

    const h = await headers();
    const base = origin(h);
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/seller/apply?stripe=refresh`,
      return_url: `${base}/seller/apply?stripe=return`,
      type: 'account_onboarding',
    });
    return { url: link.url };
  } catch (e: unknown) {
    const msg = (e as { message?: string })?.message ?? '';
    console.error('stripe onboarding error:', msg);
    // The platform's Connect profile must be completed before creating accounts:
    // https://dashboard.stripe.com/settings/connect/platform-profile
    if (/platform-profile|managing losses|responsibilities/i.test(msg)) {
      return { error: 'Configurarea Connect a platformei nu este finalizată încă. Revenim în curând.' };
    }
    return { error: 'Nu am putut deschide configurarea plăților Stripe. Încearcă din nou.' };
  }
}

/** Re-checks the seller's Stripe account and persists whether payouts are live
 *  (charges_enabled + details_submitted). Called when the seller returns from
 *  the hosted onboarding. */
export async function syncSellerStripeStatus() {
  if (!isStripeConfigured() || !stripe || !isServiceConfigured()) return { onboarded: false };
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { onboarded: false };

  const svc = createServiceClient();
  const { data: seller } = await svc.from('sellers').select('stripe_account_id').eq('id', user.id).maybeSingle();
  if (!seller?.stripe_account_id) return { onboarded: false };

  try {
    const account = await stripe.accounts.retrieve(seller.stripe_account_id);
    const onboarded = !!account.charges_enabled && !!account.details_submitted;
    await svc.from('sellers').update({ stripe_onboarded: onboarded, updated_at: new Date().toISOString() }).eq('id', user.id);
    revalidatePath('/seller/apply');
    return { onboarded };
  } catch {
    return { onboarded: false };
  }
}

/** A single-use link into the seller's hosted Stripe Express dashboard (manage
 *  payouts, bank details, identity). Only for onboarded sellers. */
export async function createStripeLoginLink() {
  if (!isStripeConfigured() || !stripe || !isServiceConfigured()) return { error: 'Indisponibil momentan.' };
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Autentificare necesară' };

  const svc = createServiceClient();
  const { data: seller } = await svc.from('sellers').select('stripe_account_id, stripe_onboarded').eq('id', user.id).maybeSingle();
  if (!seller?.stripe_account_id || !seller.stripe_onboarded) return { error: 'Plățile nu sunt configurate încă.' };

  try {
    const link = await stripe.accounts.createLoginLink(seller.stripe_account_id);
    return { url: link.url };
  } catch {
    return { error: 'Nu am putut deschide panoul Stripe.' };
  }
}
