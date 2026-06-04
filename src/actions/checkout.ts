'use server';

import { headers } from 'next/headers';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient, isServiceConfigured } from '@/lib/supabase/admin';

const COMMISSION_RATE = 0.15; // platform takes 15% (see docs/PLAN-MARKETPLACE-RO.md)

// Listings owned by the platform owner (Deco Kubik) check out to the platform's
// own Stripe account (100%); marketplace sellers use direct charges + fee.
function platformOwnerIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? '3f6538a6-af42-48fe-99b3-56ed9fbcaf08')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Stripe Checkout for a listing.
 * - Platform-owned listing → normal checkout to the platform account.
 * - Marketplace seller → **direct charge** on the seller's connected account
 *   (seller is merchant + bears Stripe fee) with a 15% `application_fee_amount`
 *   to the platform. Requires the seller to have completed Connect onboarding.
 */
export async function createCheckoutSession(listingId: string) {
  if (!isStripeConfigured() || !stripe) {
    return { error: 'Plățile nu sunt configurate momentan.' };
  }

  const supabase = await createServerClient();
  const { data: listing, error } = await supabase
    .from('listings')
    .select('id, title, price, image_urls, status, seller_id')
    .eq('id', listingId)
    .single();

  if (error || !listing) return { error: 'Produsul nu a fost găsit.' };
  if (listing.status === 'sold') return { error: 'Acest produs a fost deja vândut.' };

  const h = await headers();
  const base = h.get('origin') ?? (h.get('host') ? `https://${h.get('host')}` : 'https://craftology-peach.vercel.app');
  const unitAmount = Math.round(Number(listing.price) * 100);
  const images = (listing.image_urls ?? [])
    .filter((u: string) => typeof u === 'string' && u.startsWith('http'))
    .slice(0, 1);

  const line_items = [
    { quantity: 1, price_data: { currency: 'ron', unit_amount: unitAmount, product_data: { name: listing.title, images } } },
  ];
  const success_url = `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancel_url = `${base}/listings/${listing.id}`;

  try {
    // Platform's own product (Deco Kubik) → money to the platform, no split.
    if (platformOwnerIds().includes(listing.seller_id)) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items,
        metadata: { listing_id: listing.id },
        success_url,
        cancel_url,
      });
      return { url: session.url };
    }

    // Marketplace seller → direct charge on their connected account + 15% fee.
    if (!isServiceConfigured()) return { error: 'Plățile pentru vânzători nu sunt configurate complet.' };
    const svc = createServiceClient();
    const { data: seller } = await svc
      .from('sellers')
      .select('stripe_account_id, stripe_onboarded, status')
      .eq('id', listing.seller_id)
      .maybeSingle();

    if (!seller || seller.status !== 'approved' || !seller.stripe_account_id || !seller.stripe_onboarded) {
      return { error: 'Vânzătorul nu poate primi plăți momentan.' };
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items,
        payment_intent_data: { application_fee_amount: Math.round(unitAmount * COMMISSION_RATE) },
        metadata: { listing_id: listing.id },
        success_url,
        cancel_url,
      },
      { stripeAccount: seller.stripe_account_id },
    );
    return { url: session.url };
  } catch (e) {
    console.error('Stripe checkout error:', e);
    return { error: 'Eroare la inițierea plății. Încearcă din nou.' };
  }
}
