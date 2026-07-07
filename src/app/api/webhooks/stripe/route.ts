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
  // Two endpoints can point here with different signing secrets: the original
  // platform-account endpoint (STRIPE_WEBHOOK_SECRET) and the connected-accounts
  // endpoint (STRIPE_CONNECT_WEBHOOK_SECRET) that carries marketplace-seller
  // events. Verification tries each configured secret.
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
    (s): s is string => !!s,
  );
  if (!isStripeConfigured() || !stripe || secrets.length === 0) {
    return NextResponse.json({ received: true, note: 'stripe webhook not configured' });
  }

  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event: Stripe.Event | null = null;
  let lastErr: Error | null = null;
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature ?? '', secret);
      break;
    } catch (err) {
      lastErr = err as Error;
    }
  }
  if (!event) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${lastErr?.message ?? 'no matching secret'}` },
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
      // We charge a 10% application fee on marketplace (connected-account) sales
      // (must match COMMISSION_RATE in checkout.ts); platform-owned listings take none.
      const applicationFee = stripeAccountId ? Math.round(amountTotal * 0.1) : 0;

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
