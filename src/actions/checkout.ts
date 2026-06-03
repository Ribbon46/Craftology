'use server';

import { stripe, isStripeConfigured } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * Creates a Stripe Checkout Session for a listing and returns the hosted
 * payment URL. The client redirects to it. Payment goes to the shop's Stripe
 * account (single-seller MVP). For a multi-seller marketplace this becomes
 * Stripe Connect with destination charges so funds route to each seller.
 */
export async function createCheckoutSession(listingId: string) {
  if (!isStripeConfigured() || !stripe) {
    return { error: 'Plățile nu sunt configurate momentan.' };
  }

  const supabase = await createServerClient();
  const { data: listing, error } = await supabase
    .from('listings')
    .select('id, title, price, image_urls, status')
    .eq('id', listingId)
    .single();

  if (error || !listing) return { error: 'Produsul nu a fost găsit.' };
  if (listing.status === 'sold') return { error: 'Acest produs a fost deja vândut.' };

  const h = await headers();
  const origin =
    h.get('origin') ?? (h.get('host') ? `https://${h.get('host')}` : 'https://craftology-peach.vercel.app');

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'ron',
            unit_amount: Math.round(Number(listing.price) * 100),
            product_data: {
              name: listing.title,
              images: (listing.image_urls ?? [])
                .filter((u: string) => typeof u === 'string' && u.startsWith('http'))
                .slice(0, 1),
            },
          },
        },
      ],
      metadata: { listing_id: listing.id },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/listings/${listing.id}`,
    });
    return { url: session.url };
  } catch (e) {
    // Log the raw Stripe error server-side; return a clean, generic message.
    console.error('Stripe checkout error:', e);
    return { error: 'Eroare la inițierea plății. Încearcă din nou.' };
  }
}
