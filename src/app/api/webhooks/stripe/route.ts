import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Stripe webhook: on successful checkout, mark the listing as sold.
// Marking sold bypasses RLS, so it needs SUPABASE_SERVICE_ROLE_KEY (server-only).
// Configure the endpoint in the Stripe dashboard → Webhooks, pointing at
// <your-domain>/api/webhooks/stripe, and set STRIPE_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isStripeConfigured() || !stripe || !webhookSecret) {
    return NextResponse.json({ received: true, note: 'stripe webhook not configured' });
  }

  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? '', webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only mark sold once payment is actually collected. Async/delayed methods
    // complete the session as 'unpaid' and can fail later, so a bare
    // `completed` event must not flip inventory and block other buyers.
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true, note: 'payment not yet collected' });
    }

    const listingId = session.metadata?.listing_id;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (listingId && url && serviceKey) {
      const admin = createClient(url, serviceKey);
      await admin.from('listings').update({ status: 'sold' }).eq('id', listingId);
    }
  }

  return NextResponse.json({ received: true });
}
