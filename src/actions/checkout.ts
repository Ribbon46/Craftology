'use server';

import { headers } from 'next/headers';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient, isServiceConfigured } from '@/lib/supabase/admin';
import { isPlatformOwner } from '@/lib/owner';

const COMMISSION_RATE = 0.1; // platform takes 10% (per the Seller Agreement)

/**
 * Stripe Checkout for a listing.
 * - Platform-owned listing → normal checkout to the platform account.
 * - Marketplace seller → **direct charge** on the seller's connected account
 *   (seller is merchant + bears Stripe fee) with a 10% `application_fee_amount`
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

  // Capture the buyer id when they're logged in (buying doesn't require it) so
  // an order can later be tied to their account + cancelled from their profile.
  const {
    data: { user: buyer },
  } = await supabase.auth.getUser();
  const orderMeta = { listing_id: listing.id, seller_id: listing.seller_id, buyer_id: buyer?.id ?? '' };

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
    // Collect the buyer's delivery address + phone at checkout so the seller
    // can ship the order. Stripe gathers these on its hosted page and exposes
    // them to the seller (on their connected account); the platform doesn't
    // store them. Restricted to Romania — the marketplace's audience.
    const fulfilment = {
      shipping_address_collection: { allowed_countries: ['RO' as const] },
      phone_number_collection: { enabled: true },
    };

    // Seller on vacation → block new purchases until they're back (the UI also
    // disables the button; this is the server-side enforcement).
    const { data: vac } = await supabase
      .from('sellers')
      .select('vacation_until')
      .eq('id', listing.seller_id)
      .maybeSingle();
    if (vac?.vacation_until) {
      const until = new Date(vac.vacation_until + 'T00:00:00');
      if (until > new Date()) {
        const dateRo = until.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
        return { error: `Vânzătorul este momentan în vacanță și nu poate livra. Revine în data de ${dateRo}.` };
      }
    }

    // Sessions expire after 30 min (Stripe minimum) instead of the 24h default,
    // shrinking the window where two buyers can both hold open checkouts for
    // the same single-quantity handmade item.
    const expires_at = Math.floor(Date.now() / 1000) + 30 * 60;

    // Platform's own product (Deco Kubik) → money to the platform, no split.
    if (isPlatformOwner(listing.seller_id)) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items,
        ...fulfilment,
        metadata: orderMeta,
        success_url,
        cancel_url,
        expires_at,
      });
      return { url: session.url };
    }

    // Marketplace seller → direct charge on their connected account + 10% fee.
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
        ...fulfilment,
        payment_intent_data: { application_fee_amount: Math.round(unitAmount * COMMISSION_RATE) },
        metadata: orderMeta,
        success_url,
        cancel_url,
        expires_at,
      },
      { stripeAccount: seller.stripe_account_id },
    );
    return { url: session.url };
  } catch (e) {
    console.error('Stripe checkout error:', e);
    return { error: 'Eroare la inițierea plății. Încearcă din nou.' };
  }
}
