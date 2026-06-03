import Stripe from 'stripe';

// Server-only Stripe client. Gated like the Supabase config: the app builds and
// runs without Stripe keys — the "Cumpără" button just reports that payments
// aren't configured yet. Add STRIPE_SECRET_KEY (sk_...) to enable checkout.
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';

export function isStripeConfigured(): boolean {
  return STRIPE_SECRET_KEY.startsWith('sk_');
}

export const stripe = isStripeConfigured() ? new Stripe(STRIPE_SECRET_KEY) : null;
