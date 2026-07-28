'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient, isServiceConfigured } from '@/lib/supabase/admin';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { isAdminUser } from '@/actions/admin';

export interface OrderRow {
  id: string;
  listing_id: string;
  buyer_email: string | null;
  amount_total: number;
  status: 'paid' | 'cancelled' | 'refunded';
  cancelled_by: 'buyer' | 'seller' | 'admin' | null;
  created_at: string;
  listings: { title: string } | null;
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
  status: string;
  stripe_refund_id: string | null;
}

/**
 * Refund an order in full + reverse the platform fee, then re-list the item.
 * Shared by the seller, buyer and admin cancel paths. Money-safe:
 *  - idempotency key on the Stripe refund (concurrent calls → one refund)
 *  - conditional UPDATE (paid→refunded) so only one writer re-lists
 *  - direct-charge shape: refund on the connected account + refund_application_fee
 */
async function refundOrder(
  order: FullOrder,
  cancelledBy: 'buyer' | 'seller' | 'admin',
  reason?: string,
): Promise<{ success: true } | { error: string }> {
  if (!isStripeConfigured() || !stripe) return { error: 'Plățile nu sunt configurate.' };
  if (order.status !== 'paid') return { error: 'Comanda nu mai poate fi anulată.' };

  const svc = createServiceClient();

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
          // Marketplace (connected account): return the platform's 10% fee too.
          ...(order.stripe_account_id ? { refund_application_fee: true } : {}),
          // Only order_id in the refund body — cancelled_by is recorded in our
          // DB, not here, so concurrent seller+buyer cancels share an identical
          // idempotent request body (differing metadata would 400 the replay).
          metadata: { order_id: order.id },
        },
        {
          ...(order.stripe_account_id ? { stripeAccount: order.stripe_account_id } : {}),
          idempotencyKey: `refund_${order.id}`,
        },
      );

      // Conditional flip: only the writer that moves paid→refunded proceeds.
      const { data: flipped } = await svc
        .from('orders')
        .update({
          status: 'refunded',
          amount_refunded: order.amount_total,
          cancelled_by: cancelledBy,
          cancel_reason: reason ?? null,
          stripe_refund_id: refund.id,
          refunded_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .eq('status', 'paid')
        .select('id');

      if (flipped && flipped.length > 0) {
        await svc.from('listings').update({ status: 'active' }).eq('id', order.listing_id);
      }
    }

    revalidatePath('/');
    revalidatePath(`/listings/${order.listing_id}`);
    revalidatePath('/seller/dashboard');
    revalidatePath('/profile');
    return { success: true };
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    console.error('refund error:', e);
    if (code === 'balance_insufficient') {
      return { error: 'Fonduri insuficiente pentru rambursare. Contactează-ne ca să rezolvăm.' };
    }
    return { error: 'Rambursarea a eșuat. Încearcă din nou.' };
  }
}

/** Seller cancels (out of stock) an order for their own listing. */
export async function cancelOrderAsSeller(orderId: string, reason?: string) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Autentificare necesară' };
  if (!isServiceConfigured()) return { error: 'Indisponibil momentan.' };

  const svc = createServiceClient();
  const { data: order } = await svc.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (!order) return { error: 'Comanda nu a fost găsită.' };
  if (order.seller_id !== user.id) return { error: 'Nu ai permisiunea pentru această comandă.' };
  return refundOrder(order as FullOrder, 'seller', reason);
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
      for (const r of rows.filter((x) => x.status === 'paid')) {
        const res = await refundOrder(r, 'buyer', reason);
        if ('error' in res && !firstError) firstError = res.error;
      }
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
  return refundOrder(order, 'buyer', reason);
}

/** Admin force-cancel (refund) any order. */
export async function cancelOrderAsAdmin(orderId: string, reason?: string) {
  if (!(await isAdminUser())) return { error: 'Acces interzis' };
  if (!isServiceConfigured()) return { error: 'Indisponibil momentan.' };
  const svc = createServiceClient();
  const { data: order } = await svc.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (!order) return { error: 'Comanda nu a fost găsită.' };
  return refundOrder(order as FullOrder, 'admin', reason);
}

/** The seller's own orders (RLS lets a seller read theirs). */
export async function getSellerOrders(): Promise<OrderRow[]> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('orders')
    .select('id, listing_id, buyer_email, amount_total, status, cancelled_by, created_at, listings ( title )')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });
  return (data as unknown as OrderRow[]) ?? [];
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
    .select('id, listing_id, buyer_email, amount_total, status, cancelled_by, created_at, listings ( title )')
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
