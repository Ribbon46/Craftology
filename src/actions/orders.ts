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
          // Marketplace (connected account): return the platform's 15% too.
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
    const { data } = await svc.from('orders').select('*').eq('stripe_session_id', input.sessionId).maybeSingle();
    order = (data as FullOrder) ?? null;
    // The session id is a bearer capability (it travels in the success URL). It
    // only authorizes GUEST orders (no account). A logged-in buyer's order can't
    // be refunded by a leaked session id — they must cancel from their profile
    // (the orderId branch, which verifies ownership).
    if (order && order.buyer_id !== null) {
      return { error: 'Această comandă poate fi anulată doar din contul tău.' };
    }
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

/** Minimal order info for the checkout-success page (guest-safe, service-role). */
export async function getOrderForSuccess(
  sessionId: string,
): Promise<{ status: string; amount_total: number; title: string | null } | null> {
  if (!isServiceConfigured()) return null;
  const svc = createServiceClient();
  const { data } = await svc
    .from('orders')
    .select('status, amount_total, listings ( title )')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();
  if (!data) return null;
  const listings = data.listings as { title: string } | { title: string }[] | null;
  const title = Array.isArray(listings) ? listings[0]?.title ?? null : listings?.title ?? null;
  return { status: data.status as string, amount_total: data.amount_total as number, title };
}
