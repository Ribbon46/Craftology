import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import type Stripe from 'stripe';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Stripe webhook. On a paid checkout it RECORDS AN ORDER (source of truth for
// money/refunds) and marks the listing sold. On a refund (charge.refunded) it
// reconciles the order + re-lists the item when fully refunded — so refunds
// issued in the Stripe dashboard converge with refunds issued from the app.
// All writes use the service role (bypasses RLS); needs SUPABASE_SERVICE_ROLE_KEY.
//
// NOTE: to receive marketplace (connected-account) events here, enable
// "Listen to events on Connected accounts" on this endpoint in the Stripe
// dashboard. Connected events arrive with `event.account` set.
function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

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

  const db = admin();

  // ---- Paid checkout → record order + mark listing sold (idempotent) ----
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Async/delayed methods can complete the session as 'unpaid'; never record
    // an order or flip inventory until the money is actually collected.
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true, note: 'payment not yet collected' });
    }

    const listingId = session.metadata?.listing_id;
    if (db && listingId) {
      const sellerId = session.metadata?.seller_id || null;
      const buyerId = session.metadata?.buyer_id || null;
      const stripeAccountId = event.account ?? null;
      const amountTotal = session.amount_total ?? 0;
      // We charge a 15% application fee on marketplace (connected-account) sales;
      // platform-owned listings (no connected account) take no fee.
      const applicationFee = stripeAccountId ? Math.round(amountTotal * 0.15) : 0;

      // Upsert on the session id so Stripe retries don't create duplicates.
      const { error: insErr } = await db.from('orders').upsert(
        {
          listing_id: listingId,
          seller_id: sellerId,
          buyer_id: buyerId,
          buyer_email: session.customer_details?.email ?? null,
          stripe_session_id: session.id,
          payment_intent_id: String(session.payment_intent ?? ''),
          stripe_account_id: stripeAccountId,
          amount_total: amountTotal,
          application_fee_amount: applicationFee,
          currency: session.currency ?? 'ron',
          status: 'paid',
        },
        { onConflict: 'stripe_session_id', ignoreDuplicates: true },
      );
      if (insErr) console.error('order upsert error:', insErr.message);

      // Only mark sold if this order is still 'paid'. A late/duplicate retry of
      // checkout.session.completed arriving AFTER a refund (which re-listed the
      // item) must NOT flip it back to 'sold'.
      const { data: ord } = await db
        .from('orders')
        .select('status')
        .eq('stripe_session_id', session.id)
        .maybeSingle();
      if (ord?.status === 'paid') {
        await db.from('listings').update({ status: 'sold' }).eq('id', listingId).eq('status', 'active');
        revalidatePath('/');
        revalidatePath(`/listings/${listingId}`);
      }
    }
  }

  // ---- Refund reconciliation (dashboard refunds converge with app refunds) ----
  if (event.type === 'charge.refunded' && db) {
    const charge = event.data.object as Stripe.Charge;
    const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (pi) {
      const { data: order } = await db
        .from('orders')
        .select('id, listing_id, amount_total, status')
        .eq('payment_intent_id', pi)
        .maybeSingle();
      if (order) {
        const fully = (charge.amount_refunded ?? 0) >= order.amount_total;
        await db
          .from('orders')
          .update({
            amount_refunded: charge.amount_refunded ?? 0,
            status: fully ? 'refunded' : order.status,
            refunded_at: fully ? new Date().toISOString() : null,
          })
          .eq('id', order.id);
        // Only a FULL refund re-lists the item.
        if (fully) {
          await db.from('listings').update({ status: 'active' }).eq('id', order.listing_id);
          revalidatePath('/');
          revalidatePath(`/listings/${order.listing_id}`);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
