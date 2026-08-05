import { NextRequest, NextResponse, after } from 'next/server';
import { revalidatePath } from 'next/cache';
import type Stripe from 'stripe';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { sendEmail, escapeHtml, isEmailConfigured } from '@/lib/email';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://craftology-peach.vercel.app';
const money = (bani: number) => (bani / 100).toLocaleString('ro-RO', { minimumFractionDigits: 2 }) + ' lei';

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

/**
 * Emails the seller that an order came in, with everything they need to fulfil
 * it: what was bought, what they'll be paid, and the buyer's delivery address
 * plus invoicing details. Since we stopped asking Stripe to collect the address
 * (the buyer types it on our checkout step instead), this email is how a seller
 * gets it without opening the app.
 *
 * Idempotent across Stripe's webhook retries: the seller_notified_at stamp is
 * CLAIMED first, and only the caller that actually claimed rows sends mail.
 */
async function notifySellerOfOrder(db: SupabaseClient, sessionId: string) {
  if (!isEmailConfigured()) return;
  try {
    const { data: claimedRaw } = await db
      .from('orders')
      .update({ seller_notified_at: new Date().toISOString() })
      .eq('stripe_session_id', sessionId)
      .is('seller_notified_at', null)
      .select(
        'listing_id, seller_id, amount_total, buyer_email, buyer_name, buyer_phone, buyer_type, ' +
          'company_name, company_cui, company_address, shipping_address',
      );
    const claimed = (claimedRaw ?? []) as unknown as Array<{
      listing_id: string; seller_id: string; amount_total: number;
      buyer_email: string | null; buyer_name: string | null; buyer_phone: string | null;
      buyer_type: string | null; company_name: string | null; company_cui: string | null;
      company_address: string | null; shipping_address: string | null;
    }>;
    if (claimed.length === 0) return; // already mailed

    const sellerId = claimed[0].seller_id as string;
    const { data: seller } = await db.auth.admin.getUserById(sellerId);
    const { data: sellerRow } = await db
      .from('sellers')
      .select('contact_email, company_name')
      .eq('id', sellerId)
      .maybeSingle();
    const to = sellerRow?.contact_email || seller?.user?.email;
    if (!to) return;

    const { data: titles } = await db
      .from('listings')
      .select('id, title')
      .in('id', claimed.map((o) => o.listing_id));
    const titleById = new Map(((titles ?? []) as Array<{ id: string; title: string }>).map((l) => [l.id, l.title]));

    const b = claimed[0];
    const total = claimed.reduce((s, o) => s + Number(o.amount_total ?? 0), 0);
    const lines = claimed.map((o) => `${titleById.get(o.listing_id) ?? 'Produs'} — ${money(Number(o.amount_total ?? 0))}`);
    const billing =
      b.buyer_type === 'company'
        ? [`Firmă: ${b.company_name}`, `CUI: ${b.company_cui}`, `Sediu: ${b.company_address}`]
        : ['Persoană fizică'];
    const contact = [b.buyer_name, b.buyer_phone, b.buyer_email].filter(Boolean) as string[];

    const rows = (label: string, values: string[]) =>
      values.length
        ? `<tr><td style="padding:6px 12px 6px 0;color:#6b5c4c;vertical-align:top;white-space:nowrap">${label}</td>
             <td style="padding:6px 0">${values.map((v) => escapeHtml(v)).join('<br>')}</td></tr>`
        : '';

    await sendEmail({
      to,
      replyTo: (b.buyer_email as string) ?? undefined,
      subject: `Comandă nouă · ${money(total)} · Craft'zaar`,
      text: [
        'Ai primit o comandă nouă pe Craft\'zaar.',
        '',
        ...lines,
        `TOTAL ÎNCASAT: ${money(total)}`,
        '',
        'CLIENT: ' + contact.join(' · '),
        'FACTURARE: ' + billing.join(' · '),
        'LIVRARE: ' + (b.shipping_address ?? '—'),
        '',
        `Comenzile tale: ${SITE_URL}/seller/dashboard`,
      ].join('\n'),
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#2a211a">
          <h2 style="font-size:19px;margin:0 0 4px">Comandă nouă</h2>
          <p style="margin:0 0 18px;color:#6b5c4c">Ai primit o comandă pe Craft'zaar. Iată ce trebuie expediat.</p>

          <table style="width:100%;border-collapse:collapse;background:#faf5ea;border:1px solid #d8c9ad;border-radius:10px">
            <tbody>
              ${claimed
                .map(
                  (o) => `<tr>
                    <td style="padding:10px 14px">${escapeHtml(titleById.get(o.listing_id) ?? 'Produs')}</td>
                    <td style="padding:10px 14px;text-align:right;white-space:nowrap">${money(Number(o.amount_total ?? 0))}</td>
                  </tr>`,
                )
                .join('')}
              <tr>
                <td style="padding:10px 14px;border-top:1px solid #d8c9ad"><strong>Total încasat</strong></td>
                <td style="padding:10px 14px;border-top:1px solid #d8c9ad;text-align:right"><strong>${money(total)}</strong></td>
              </tr>
            </tbody>
          </table>

          <table style="width:100%;border-collapse:collapse;margin-top:18px;font-size:14px">
            <tbody>
              ${rows('Client', contact)}
              ${rows('Facturare', billing)}
              ${rows('Adresa de livrare', [(b.shipping_address as string) ?? '—'])}
            </tbody>
          </table>

          <p style="margin-top:22px">
            <a href="${SITE_URL}/seller/dashboard" style="display:inline-block;background:#b8562f;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none">
              Vezi comenzile
            </a>
          </p>
          <p style="font-size:13px;color:#6b5c4c">
            Poți răspunde direct la acest email ca să iei legătura cu clientul. Clientul are drept de retur 14 zile.
          </p>
        </div>`,
    });
  } catch (e) {
    console.error('seller order notification failed:', e);
  }
}

/**
 * "Creează-mi cont" at checkout: once the payment lands, create the Supabase
 * account for that email and mail them a link to set a password. Idempotent —
 * the `account_created` flag stops Stripe retries from re-sending the invite,
 * and an email that already has an account is simply skipped.
 */
async function createAccountIfRequested(db: SupabaseClient, sessionId: string) {
  const { data: cd } = await db
    .from('checkout_details')
    .select('email, full_name, create_account, account_created')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();
  if (!cd?.create_account || cd.account_created || !cd.email) return;

  // Claim it first: a concurrent retry that loses this race sees the flag set
  // and bails, so the buyer never gets two invitations.
  const { data: claimed } = await db
    .from('checkout_details')
    .update({ account_created: true })
    .eq('stripe_session_id', sessionId)
    .eq('account_created', false)
    .select('stripe_session_id');
  if (!claimed || claimed.length === 0) return;

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://craftology-peach.vercel.app';
    const { error } = await db.auth.admin.inviteUserByEmail(cd.email, {
      data: { full_name: cd.full_name ?? null },
      redirectTo: `${origin}/profile/edit`,
    });
    // "already registered" is a success from the buyer's point of view — they
    // have an account, which is all they asked for.
    if (error && !/already/i.test(error.message)) {
      console.error('checkout account creation failed:', error.message);
      await db.from('checkout_details').update({ account_created: false }).eq('stripe_session_id', sessionId);
    }
  } catch (e) {
    console.error('checkout account creation threw:', e);
    await db.from('checkout_details').update({ account_created: false }).eq('stripe_session_id', sessionId);
  }
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

      // Invoicing/delivery details the buyer filled in on our checkout step
      // (individual vs company, company CUI, addresses) — captured before the
      // redirect and stamped onto every order row of this session.
      const { data: cd } = await db
        .from('checkout_details')
        .select('email, full_name, phone, buyer_type, company_name, company_cui, company_address, shipping_address')
        .eq('stripe_session_id', session.id)
        .maybeSingle();

      // We charge a 10% application fee on marketplace (connected-account) sales
      // (must match COMMISSION_RATE in checkout.ts); platform-owned listings take none.
      const rows = listingIds.map((id) => ({
        listing_id: id,
        seller_id: sellerId,
        buyer_id: buyerId,
        buyer_email: cd?.email ?? session.customer_details?.email ?? null,
        buyer_name: cd?.full_name ?? session.customer_details?.name ?? null,
        buyer_phone: cd?.phone ?? session.customer_details?.phone ?? null,
        buyer_type: cd?.buyer_type ?? 'individual',
        company_name: cd?.company_name ?? null,
        company_cui: cd?.company_cui ?? null,
        company_address: cd?.company_address ?? null,
        shipping_address: cd?.shipping_address ?? null,
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

      // Only touch inventory for items whose order is still 'paid'. A late or
      // duplicate retry arriving AFTER a refund (which re-listed the item) must
      // NOT consume stock again.
      const { data: ords } = await db
        .from('orders')
        .select('listing_id, status')
        .eq('stripe_session_id', session.id);
      const stillPaid = ((ords ?? []) as Array<{ listing_id: string; status: string }>)
        .filter((o) => o.status === 'paid')
        .map((o) => o.listing_id);
      if (stillPaid.length > 0) {
        // Sellers can stock several copies of a piece, so a sale decrements
        // rather than flips: only the last one taken marks the listing sold.
        await db.rpc('consume_listing_stock', { p_listing_ids: stillPaid });
        revalidatePath('/');
        stillPaid.forEach((id) => revalidatePath(`/listings/${id}`));
      }

      // Buyer asked for an account at checkout → create it now that they've
      // paid, and email them a link to set a password.
      await createAccountIfRequested(db, session.id);

      // Tell the seller what to ship and where. Runs after the 200 so a slow
      // SMTP handshake can't push Stripe into retrying the whole webhook.
      const sessionId = session.id;
      after(() => notifySellerOfOrder(db, sessionId));
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
          await db.rpc('restore_listing_stock', { p_listing_ids: listingIds });
          revalidatePath('/');
          listingIds.forEach((id) => revalidatePath(`/listings/${id}`));
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
