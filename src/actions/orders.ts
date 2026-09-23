'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient, isServiceConfigured } from '@/lib/supabase/admin';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { sendEmail, escapeHtml, isEmailConfigured } from '@/lib/email';
import { isAdminUser } from '@/actions/admin';
import { COMPANY, SELLER_CANCEL_REASONS, COMMISSION_REFUND_WINDOW_HOURS, commissionRefundable } from '@/config/app';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://craftology-peach.vercel.app';
const money = (bani: number) => (bani / 100).toLocaleString('ro-RO', { minimumFractionDigits: 2 }) + ' lei';

type Canceller = 'buyer' | 'seller' | 'admin';

export interface OrderRow {
  id: string;
  listing_id: string;
  buyer_email: string | null;
  amount_total: number;
  status: 'paid' | 'cancelled' | 'refunded';
  cancelled_by: Canceller | null;
  cancel_reason: string | null;
  created_at: string;
  listings: { title: string } | null;
}

/** What the seller's "Comenzi" tab shows: the order plus everything needed to
 *  ship and invoice it, and the money breakdown. */
export interface SellerOrderRow extends Omit<OrderRow, 'listings'> {
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_type: string | null;
  company_name: string | null;
  company_cui: string | null;
  company_address: string | null;
  shipping_address: string | null;
  application_fee_amount: number;
  amount_refunded: number;
  refunded_at: string | null;
  listings: { title: string; image_urls: string[] | null } | null;
}

// Full order incl. the service-only Stripe ids — read with the service client.
interface FullOrder {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_id: string | null;
  buyer_email: string | null;
  payment_intent_id: string;
  stripe_account_id: string | null;
  amount_total: number;
  application_fee_amount: number;
  status: string;
  stripe_refund_id: string | null;
  created_at: string;
}

type RefundResult = { success: true; claimed: boolean } | { error: string };

/**
 * Refund the buyer in full, then put the item back in stock. Shared by the
 * seller, buyer and admin cancel paths. The platform fee goes back to the
 * seller only inside COMMISSION_REFUND_WINDOW_HOURS of the order. Money-safe:
 *  - idempotency key on the Stripe refund (concurrent calls → one refund)
 *  - conditional UPDATE (paid→refunded) so only one writer restocks
 *  - direct-charge shape: refund on the connected account (+ refund_application_fee)
 * `claimed` is true for exactly one caller per order — the one that recorded
 * who cancelled and why — and only that caller sends the notification emails.
 */
async function refundOrder(order: FullOrder, cancelledBy: Canceller, reason?: string): Promise<RefundResult> {
  if (!isStripeConfigured() || !stripe) return { error: 'Plățile nu sunt configurate.' };
  if (order.status !== 'paid') return { error: 'Comanda nu mai poate fi anulată.' };

  const svc = createServiceClient();
  let claimed = false;

  try {
    if (!order.stripe_refund_id) {
      const refund = await stripe.refunds.create(
        {
          payment_intent: order.payment_intent_id,
          // Always scope the refund to THIS item's amount: a cart payment covers
          // several orders on one payment intent, so a full-intent refund would
          // wrongly return the whole basket. Stripe refunds the application fee
          // proportionally when an amount is given.
          amount: order.amount_total,
          // Marketplace (connected account): the buyer's refund comes out of the
          // seller's balance; the platform's fee is returned to them only when
          // the order is cancelled early enough. Otherwise Craft'zaar keeps it.
          ...(order.stripe_account_id && commissionRefundable(order.created_at)
            ? { refund_application_fee: true }
            : {}),
          // Only order_id in the refund body — cancelled_by is recorded in our
          // DB, not here, so concurrent seller+buyer cancels share an identical
          // idempotent request body (differing metadata would 400 the replay).
          // The fee flag depends only on the order's age, so it matches too.
          metadata: { order_id: order.id },
        },
        {
          ...(order.stripe_account_id ? { stripeAccount: order.stripe_account_id } : {}),
          idempotencyKey: `refund_${order.id}`,
        },
      );

      const who = { cancelled_by: cancelledBy, cancel_reason: reason ?? null, stripe_refund_id: refund.id };

      // Conditional flip: only the writer that moves paid→refunded restocks.
      const { data: flipped } = await svc
        .from('orders')
        .update({
          status: 'refunded',
          amount_refunded: order.amount_total,
          refunded_at: new Date().toISOString(),
          ...who,
        })
        .eq('id', order.id)
        .eq('status', 'paid')
        .select('id');

      if (flipped && flipped.length > 0) {
        claimed = true;
        // +1 stock and back to 'active' (the sale may have flipped it to 'sold').
        await svc.rpc('restore_listing_stock', { p_listing_ids: [order.listing_id] });
      } else {
        // Stripe's charge.refunded webhook can land between the refund call and
        // the flip above and flip the row itself (restocking, but without the
        // who/why). Record them onto that row so both parties still get told.
        const { data: late } = await svc
          .from('orders')
          .update(who)
          .eq('id', order.id)
          .eq('status', 'refunded')
          .is('cancelled_by', null)
          .select('id');
        claimed = !!late && late.length > 0;
      }
    }

    revalidatePath('/');
    revalidatePath(`/listings/${order.listing_id}`);
    revalidatePath('/seller/dashboard');
    revalidatePath('/profile');
    return { success: true, claimed };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    console.error('refund error:', e);
    if (code === 'balance_insufficient') {
      return { error: 'Fonduri insuficiente pentru rambursare. Contactează-ne ca să rezolvăm.' };
    }
    return { error: 'Rambursarea a eșuat. Încearcă din nou.' };
  }
}

/**
 * Tells the buyer their order was cancelled and refunded (always — for a
 * buyer-initiated withdrawal this is the confirmation OUG 34/2014 requires),
 * and tells the seller when someone else cancelled, so they don't ship it.
 * `orders` all belong to one checkout (same buyer, same seller).
 */
async function notifyCancellation(orders: FullOrder[], cancelledBy: Canceller, reason?: string) {
  if (!isEmailConfigured() || orders.length === 0) return;
  try {
    const svc = createServiceClient();
    const sellerId = orders[0].seller_id;
    const [{ data: titles }, { data: sellerRow }, { data: profile }] = await Promise.all([
      svc.from('listings').select('id, title').in('id', orders.map((o) => o.listing_id)),
      svc.from('sellers').select('company_name, contact_email').eq('id', sellerId).maybeSingle(),
      svc.from('profiles').select('full_name, username').eq('id', sellerId).maybeSingle(),
    ]);
    const titleById = new Map(((titles ?? []) as Array<{ id: string; title: string }>).map((l) => [l.id, l.title]));
    const shop = sellerRow?.company_name || profile?.full_name || profile?.username || 'Atelierul';
    const total = orders.reduce((s, o) => s + Number(o.amount_total ?? 0), 0);
    const items = orders.map((o) => ({ title: titleById.get(o.listing_id) ?? 'Produs', amount: Number(o.amount_total ?? 0) }));
    const placed = new Date(orders[0].created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });

    const itemsTable = `
      <table style="width:100%;border-collapse:collapse;background:#faf5ea;border:1px solid #d8c9ad;border-radius:10px">
        <tbody>
          ${items
            .map(
              (i) => `<tr>
                <td style="padding:10px 14px">${escapeHtml(i.title)}</td>
                <td style="padding:10px 14px;text-align:right;white-space:nowrap">${money(i.amount)}</td>
              </tr>`,
            )
            .join('')}
          <tr>
            <td style="padding:10px 14px;border-top:1px solid #d8c9ad"><strong>Total rambursat</strong></td>
            <td style="padding:10px 14px;border-top:1px solid #d8c9ad;text-align:right"><strong>${money(total)}</strong></td>
          </tr>
        </tbody>
      </table>`;
    const reasonHtml = reason
      ? `<p style="margin:18px 0 0"><span style="color:#6b5c4c">Motiv:</span> ${escapeHtml(reason)}</p>`
      : '';
    const wrap = (inner: string) =>
      `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#2a211a">${inner}</div>`;

    // ---- Buyer ----
    const buyerEmail = orders[0].buyer_email;
    if (buyerEmail) {
      const copy = {
        seller: {
          subject: `Comanda ta a fost anulată de ${shop}`,
          heading: 'Comanda ta a fost anulată',
          intro: `Ne pare rău — ${shop} nu poate onora comanda ta din ${placed}, așa că a anulat-o.`,
        },
        buyer: {
          subject: 'Confirmare: comanda ta a fost anulată',
          heading: 'Am primit cererea ta de retragere',
          intro: `Îți confirmăm primirea cererii de retragere din contract pentru comanda din ${placed}. Comanda a fost anulată.`,
        },
        admin: {
          subject: 'Comanda ta a fost anulată',
          heading: 'Comanda ta a fost anulată',
          intro: `Echipa Craft'zaar a anulat comanda ta din ${placed}.`,
        },
      }[cancelledBy];
      const refundLine =
        `Ți-am returnat automat ${money(total)} pe cardul cu care ai plătit. ` +
        'În funcție de bancă, banii apar în cont în 5–10 zile lucrătoare.';

      await sendEmail({
        to: buyerEmail,
        subject: `${copy.subject} · Craft'zaar`,
        text: [
          copy.intro,
          '',
          ...items.map((i) => `${i.title} — ${money(i.amount)}`),
          `TOTAL RAMBURSAT: ${money(total)}`,
          ...(reason ? ['', `Motiv: ${reason}`] : []),
          '',
          refundLine,
          '',
          `Ai întrebări? Scrie-ne la ${COMPANY.email}.`,
        ].join('\n'),
        html: wrap(`
          <h2 style="font-size:19px;margin:0 0 4px">${escapeHtml(copy.heading)}</h2>
          <p style="margin:0 0 18px;color:#6b5c4c">${escapeHtml(copy.intro)}</p>
          ${itemsTable}
          ${reasonHtml}
          <p style="margin:18px 0 0">${escapeHtml(refundLine)}</p>
          <p style="margin-top:22px">
            <a href="${SITE_URL}" style="display:inline-block;background:#b8562f;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none">
              Descoperă alte produse
            </a>
          </p>
          <p style="font-size:13px;color:#6b5c4c">Ai întrebări? Scrie-ne la ${escapeHtml(COMPANY.email)}.</p>`),
      });
    }

    // ---- Seller (only when someone else cancelled — they did it themselves otherwise) ----
    if (cancelledBy !== 'seller') {
      const { data: sellerUser } = await svc.auth.admin.getUserById(sellerId);
      const to = sellerRow?.contact_email || sellerUser?.user?.email;
      if (to) {
        const intro =
          cancelledBy === 'buyer'
            ? `Clientul a renunțat la comanda din ${placed} și a primit automat banii înapoi.`
            : `Echipa Craft'zaar a anulat comanda din ${placed}, iar clientul a primit banii înapoi.`;
        const shipLine =
          'Nu mai expedia produsul. Dacă l-ai expediat deja, clientul îl returnează conform politicii de retur. ' +
          'Produsul a revenit în stoc.';
        // Same rule refundOrder just applied: early cancellations return the fee.
        const fee = orders.reduce((s, o) => s + (o.stripe_account_id ? Number(o.application_fee_amount ?? 0) : 0), 0);
        const feeLine =
          fee <= 0
            ? ''
            : commissionRefundable(orders[0].created_at)
              ? `Comisionul Craft'zaar de ${money(fee)} ți-a fost returnat.`
              : `Comisionul Craft'zaar de ${money(fee)} nu se returnează, pentru că anularea a avut loc la mai mult de ${COMMISSION_REFUND_WINDOW_HOURS} de ore de la comandă.`;
        await sendEmail({
          to,
          subject: `Comandă anulată · ${items[0].title}${items.length > 1 ? ` + încă ${items.length - 1}` : ''} · Craft'zaar`,
          text: [
            intro,
            '',
            ...items.map((i) => `${i.title} — ${money(i.amount)}`),
            ...(reason ? ['', `Motiv: ${reason}`] : []),
            '',
            shipLine,
            ...(feeLine ? [feeLine] : []),
            '',
            `Comenzile tale: ${SITE_URL}/seller/dashboard?tab=comenzi`,
          ].join('\n'),
          html: wrap(`
            <h2 style="font-size:19px;margin:0 0 4px">Comandă anulată</h2>
            <p style="margin:0 0 18px;color:#6b5c4c">${escapeHtml(intro)}</p>
            ${itemsTable}
            ${reasonHtml}
            <p style="margin:18px 0 0"><strong>${escapeHtml(shipLine)}</strong></p>
            ${feeLine ? `<p style="margin:10px 0 0;color:#6b5c4c">${escapeHtml(feeLine)}</p>` : ''}
            <p style="margin-top:22px">
              <a href="${SITE_URL}/seller/dashboard?tab=comenzi" style="display:inline-block;background:#b8562f;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none">
                Vezi comenzile
              </a>
            </p>`),
        });
      }
    }
  } catch (e) {
    console.error('cancellation email failed:', e);
  }
}

/**
 * Seller refuses/cancels an order for their own listing — at any time —
 * picking a reason the buyer will see. The buyer is refunded automatically.
 */
export async function cancelOrderAsSeller(orderId: string, reason: { code: string; details?: string }) {
  const picked = SELLER_CANCEL_REASONS.find((r) => r.code === reason?.code);
  if (!picked) return { error: 'Alege motivul anulării.' };
  const details = (reason.details ?? '').trim().slice(0, 500);
  if (picked.code === 'other' && !details) return { error: 'Scrie pe scurt motivul anulării.' };
  const reasonText = picked.code === 'other' ? details : details ? `${picked.label} — ${details}` : picked.label;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Autentificare necesară' };
  if (!isServiceConfigured()) return { error: 'Indisponibil momentan.' };

  const svc = createServiceClient();
  const { data } = await svc.from('orders').select('*').eq('id', orderId).maybeSingle();
  const order = data as FullOrder | null;
  if (!order) return { error: 'Comanda nu a fost găsită.' };
  if (order.seller_id !== user.id) return { error: 'Nu ai permisiunea pentru această comandă.' };

  const res = await refundOrder(order, 'seller', reasonText);
  if ('success' in res && res.claimed) after(() => notifyCancellation([order], 'seller', reasonText));
  return res;
}

/**
 * Buyer cancels (changed mind). Logged-in buyer → by orderId (ownership by
 * buyer_id / email). Guest → by the Stripe session id, which is an unguessable
 * capability only ever returned to that buyer on the success page.
 */
export async function cancelOrderByBuyer(
  input: { orderId?: string; sessionId?: string },
  reason?: string,
) {
  if (!isServiceConfigured()) return { error: 'Indisponibil momentan.' };
  const svc = createServiceClient();

  let order: FullOrder | null = null;
  if (input.sessionId) {
    // A cart payment produces one order per item — cancel them all together.
    const { data } = await svc.from('orders').select('*').eq('stripe_session_id', input.sessionId);
    const rows = (data ?? []) as FullOrder[];
    // The session id is a bearer capability (it travels in the success URL). It
    // only authorizes GUEST orders (no account). A logged-in buyer's order can't
    // be refunded by a leaked session id — they must cancel from their profile
    // (the orderId branch, which verifies ownership).
    if (rows.some((r) => r.buyer_id !== null)) {
      return { error: 'Această comandă poate fi anulată doar din contul tău.' };
    }
    if (rows.length === 0) return { error: 'Comanda nu a fost găsită.' };
    if (rows.length > 1) {
      let firstError: string | null = null;
      const claimed: FullOrder[] = [];
      for (const r of rows.filter((x) => x.status === 'paid')) {
        const res = await refundOrder(r, 'buyer', reason);
        if ('error' in res) {
          if (!firstError) firstError = res.error;
        } else if (res.claimed) {
          claimed.push(r);
        }
      }
      // One email for the whole basket, not one per item.
      if (claimed.length > 0) after(() => notifyCancellation(claimed, 'buyer', reason));
      return firstError ? { error: firstError } : { success: true };
    }
    order = rows[0];
  } else if (input.orderId) {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: 'Autentificare necesară' };
    const { data } = await svc.from('orders').select('*').eq('id', input.orderId).maybeSingle();
    order = (data as FullOrder) ?? null;
    if (
      order &&
      !(order.buyer_id === user.id ||
        (order.buyer_email && user.email && order.buyer_email.toLowerCase() === user.email.toLowerCase()))
    ) {
      return { error: 'Nu ai permisiunea pentru această comandă.' };
    }
  }

  if (!order) return { error: 'Comanda nu a fost găsită.' };
  const res = await refundOrder(order, 'buyer', reason);
  const cancelled = order;
  if ('success' in res && res.claimed) after(() => notifyCancellation([cancelled], 'buyer', reason));
  return res;
}

/** Admin force-cancel (refund) any order — no time limit. */
export async function cancelOrderAsAdmin(orderId: string, reason?: string) {
  if (!(await isAdminUser())) return { error: 'Acces interzis' };
  if (!isServiceConfigured()) return { error: 'Indisponibil momentan.' };
  const svc = createServiceClient();
  const { data } = await svc.from('orders').select('*').eq('id', orderId).maybeSingle();
  const order = data as FullOrder | null;
  if (!order) return { error: 'Comanda nu a fost găsită.' };
  const res = await refundOrder(order, 'admin', reason);
  if ('success' in res && res.claimed) after(() => notifyCancellation([order], 'admin', reason));
  return res;
}

/** The seller's own orders with delivery/invoicing details (RLS lets a seller read theirs). */
export async function getSellerOrders(): Promise<SellerOrderRow[]> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('orders')
    .select(
      'id, listing_id, buyer_email, amount_total, status, cancelled_by, cancel_reason, created_at, ' +
        'buyer_name, buyer_phone, buyer_type, company_name, company_cui, company_address, shipping_address, ' +
        'application_fee_amount, amount_refunded, refunded_at, listings ( title, image_urls )',
    )
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });
  return (data as unknown as SellerOrderRow[]) ?? [];
}

/** A logged-in buyer's own orders. */
export async function getMyOrders(): Promise<OrderRow[]> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('orders')
    .select('id, listing_id, buyer_email, amount_total, status, cancelled_by, cancel_reason, created_at, listings ( title )')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });
  return (data as unknown as OrderRow[]) ?? [];
}

/** Minimal order info for the checkout-success page (guest-safe, service-role).
 *  `guest` tells the UI which withdrawal path applies: guest orders cancel via
 *  the session-id capability; member orders cancel from Profil → Tranzacții. */
export async function getOrderForSuccess(
  sessionId: string,
): Promise<{
  status: string;
  amount_total: number;
  title: string | null;
  guest: boolean;
  listingIds: string[];
} | null> {
  if (!isServiceConfigured()) return null;
  const svc = createServiceClient();
  // Cart payments create one row per item — aggregate them into one summary.
  const { data } = await svc
    .from('orders')
    .select('status, amount_total, buyer_id, listing_id, listings ( title )')
    .eq('stripe_session_id', sessionId);
  const rows = (data ?? []) as Array<{
    status: string; amount_total: number; buyer_id: string | null; listing_id: string;
    listings: { title: string } | { title: string }[] | null;
  }>;
  if (rows.length === 0) return null;
  const titleOf = (l: { title: string } | { title: string }[] | null) =>
    Array.isArray(l) ? l[0]?.title ?? null : l?.title ?? null;
  const first = titleOf(rows[0].listings);
  return {
    // Anything still payable keeps the order actionable (retur available).
    status: rows.some((r) => r.status === 'paid') ? 'paid' : rows[0].status,
    amount_total: rows.reduce((s, r) => s + (r.amount_total ?? 0), 0),
    title: rows.length > 1 ? `${first} + încă ${rows.length - 1} produse` : first,
    guest: rows[0].buyer_id === null,
    listingIds: rows.map((r) => r.listing_id),
  };
}
