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

    // Cart checkouts carry `listing_ids` (same seller, several items); older
    // single-product sessions carry `listing_id`.
    const listingIds = (session.metadata?.listing_ids ?? session.metadata?.listing_id ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (db && listingIds.length > 0) {
      const sellerId = session.metadata?.seller_id || null;
      const buyerId = session.metadata?.buyer_id || null;
      const stripeAccountId = event.account ?? null;
      const amountTotal = session.amount_total ?? 0;

      // Split the charged total across the items by their listed price, so each
      // order row carries its own amount (refunds are per item).
      const { data: priced } = await db.from('listings').select('id, price').in('id', listingIds);
      const priceById = new Map(
        ((priced ?? []) as Array<{ id: string; price: number }>).map((l) => [l.id, Math.round(Number(l.price) * 100)]),
      );
      const priceSum = listingIds.reduce((s, id) => s + (priceById.get(id) ?? 0), 0);
      const amounts = new Map<string, number>();
      let assigned = 0;
      listingIds.forEach((id, i) => {
        const share =
          i === listingIds.length - 1
            ? amountTotal - assigned // last item absorbs the rounding remainder
            : priceSum > 0
              ? Math.round((amountTotal * (priceById.get(id) ?? 0)) / priceSum)
              : Math.round(amountTotal / listingIds.length);
        amounts.set(id, share);
        assigned += share;
      });

      // We charge a 10% application fee on marketplace (connected-account) sales
      // (must match COMMISSION_RATE in checkout.ts); platform-owned listings take none.
      const rows = listingIds.map((id) => ({
        listing_id: id,
        seller_id: sellerId,
        buyer_id: buyerId,
        buyer_email: session.customer_details?.email ?? null,
        stripe_session_id: session.id,
        payment_intent_id: String(session.payment_intent ?? ''),
        stripe_account_id: stripeAccountId,
        amount_total: amounts.get(id) ?? 0,
        application_fee_amount: stripeAccountId ? Math.round((amounts.get(id) ?? 0) * 0.1) : 0,
        currency: session.currency ?? 'ron',
        status: 'paid',
      }));

      // Upsert on (session, listing) so Stripe retries don't create duplicates.
      const { error: insErr } = await db
        .from('orders')
        .upsert(rows, { onConflict: 'stripe_session_id,listing_id', ignoreDuplicates: true });
      if (insErr) console.error('order upsert error:', insErr.message);

      // Only mark sold the items whose order is still 'paid'. A late/duplicate
      // retry arriving AFTER a refund (which re-listed the item) must NOT flip
      // it back to 'sold'.
      const { data: ords } = await db
        .from('orders')
        .select('listing_id, status')
        .eq('stripe_session_id', session.id);
      const stillPaid = ((ords ?? []) as Array<{ listing_id: string; status: string }>)
        .filter((o) => o.status === 'paid')
        .map((o) => o.listing_id);
      if (stillPaid.length > 0) {
        await db.from('listings').update({ status: 'sold' }).in('id', stillPaid).eq('status', 'active');
        revalidatePath('/');
        stillPaid.forEach((id) => revalidatePath(`/listings/${id}`));
      }
    }
  }

  // ---- Refund reconciliation (dashboard refunds converge with app refunds) ----
  if (event.type === 'charge.refunded' && db) {
    const charge = event.data.object as Stripe.Charge;
    const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (pi) {
      // A cart payment maps to several orders sharing one payment intent, so a
      // partial refund here is ambiguous per-item — only a FULL charge refund
      // converges every order. App-initiated refunds already flip their own row.
      const { data: orders } = await db
        .from('orders')
        .select('id, listing_id, amount_total, status')
        .eq('payment_intent_id', pi);
      const rows = (orders ?? []) as Array<{ id: string; listing_id: string; amount_total: number; status: string }>;
      if (rows.length > 0) {
        const chargeFullyRefunded = (charge.amount_refunded ?? 0) >= (charge.amount ?? 0);
        if (chargeFullyRefunded) {
          const ids = rows.map((o) => o.id);
          const listingIds = rows.map((o) => o.listing_id);
          await db
            .from('orders')
            .update({ status: 'refunded', refunded_at: new Date().toISOString() })
            .in('id', ids)
            .eq('status', 'paid');
          for (const o of rows) {
            await db.from('orders').update({ amount_refunded: o.amount_total }).eq('id', o.id);
          }
          await db.from('listings').update({ status: 'active' }).in('id', listingIds);
          revalidatePath('/');
          listingIds.forEach((id) => revalidatePath(`/listings/${id}`));
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
