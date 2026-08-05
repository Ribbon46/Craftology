'use server';

import { headers } from 'next/headers';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient, isServiceConfigured } from '@/lib/supabase/admin';
import { isPlatformOwner } from '@/lib/owner';

const COMMISSION_RATE = 0.1; // platform takes 10% (per the Seller Agreement)
// Stripe metadata values cap at 500 chars; ids are 36 chars + separator, so 10
// items per order stays well inside the limit.
const MAX_CART_ITEMS_PER_ORDER = 10;

/**
 * Invoicing + delivery details the buyer fills in on our cart page, before the
 * redirect to Stripe. Collecting them ourselves (rather than on Stripe's page)
 * is what makes the company/CUI fields and the "create my account" option
 * possible — Stripe Checkout allows at most three custom fields.
 */
export interface CheckoutDetails {
  email: string;
  fullName: string;
  phone: string;
  buyerType: 'individual' | 'company';
  companyName?: string;
  companyCui?: string;
  companyAddress?: string;
  /** For a company: tick to deliver to the registered office. */
  shippingSameAsBilling?: boolean;
  shippingAddress?: string;
  createAccount?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const trim = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/** Server-side validation — the client form mirrors these rules, never replaces them. */
function validateDetails(d: CheckoutDetails): { ok: true; value: Required<Omit<CheckoutDetails, 'shippingSameAsBilling'>> } | { ok: false; error: string } {
  const email = trim(d?.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Adresa de email nu pare validă.' };

  const fullName = trim(d?.fullName, 120);
  if (fullName.length < 3) return { ok: false, error: 'Completează numele complet.' };

  const phone = trim(d?.phone, 32);
  if (phone.replace(/\D/g, '').length < 9) return { ok: false, error: 'Completează un număr de telefon valid.' };

  const buyerType = d?.buyerType === 'company' ? 'company' : 'individual';
  let companyName = '';
  let companyCui = '';
  let companyAddress = '';

  if (buyerType === 'company') {
    companyName = trim(d?.companyName, 160);
    companyCui = trim(d?.companyCui, 32).toUpperCase().replace(/\s+/g, '');
    companyAddress = trim(d?.companyAddress, 400);
    if (companyName.length < 2) return { ok: false, error: 'Numele firmei este obligatoriu.' };
    // RO CUI: 2–10 digits, optionally prefixed RO for VAT-registered entities.
    if (!/^(RO)?\d{2,10}$/.test(companyCui)) return { ok: false, error: 'CUI-ul nu pare valid (ex. RO24386414).' };
    if (companyAddress.length < 10) return { ok: false, error: 'Adresa sediului este obligatorie.' };
  }

  // A company that ticked "same as billing" ships to its registered office.
  const shippingAddress =
    buyerType === 'company' && d?.shippingSameAsBilling ? companyAddress : trim(d?.shippingAddress, 400);
  if (shippingAddress.length < 10) return { ok: false, error: 'Adresa de livrare este obligatorie.' };

  return {
    ok: true,
    value: {
      email,
      fullName,
      phone,
      buyerType,
      companyName,
      companyCui,
      companyAddress,
      shippingAddress,
      createAccount: !!d?.createAccount,
    },
  };
}

/**
 * Cart checkout: several listings from the SAME seller in one payment.
 * Items from different artisans must check out separately, because each
 * marketplace sale is a direct charge on that seller's own connected account.
 */
export async function createCartCheckoutSession(listingIds: string[], details: CheckoutDetails) {
  if (!isStripeConfigured() || !stripe) return { error: 'Plățile nu sunt configurate momentan.' };
  const ids = [...new Set((listingIds ?? []).filter((s) => typeof s === 'string' && s.length > 0))];
  if (ids.length === 0) return { error: 'Coșul este gol.' };
  if (ids.length > MAX_CART_ITEMS_PER_ORDER) {
    return { error: `Poți comanda maximum ${MAX_CART_ITEMS_PER_ORDER} produse odată de la același atelier.` };
  }

  const checked = validateDetails(details);
  if (!checked.ok) return { error: checked.error };
  const buyerDetails = checked.value;

  const supabase = await createServerClient();
  const { data: rows, error } = await supabase
    .from('listings')
    .select('id, title, price, shipping_price, stock, image_urls, status, seller_id')
    .in('id', ids);
  if (error) return { error: 'Eroare la verificarea produselor. Încearcă din nou.' };

  const listings = (rows ?? []) as Array<{
    id: string; title: string; price: number; shipping_price: number | null; stock: number | null;
    image_urls: string[] | null; status: string; seller_id: string;
  }>;
  if (listings.length !== ids.length) {
    return { error: 'Unele produse nu mai sunt disponibile. Reîmprospătează coșul.' };
  }
  const sold = listings.find((l) => l.status !== 'active' || Number(l.stock ?? 0) < 1);
  if (sold) return { error: `„${sold.title}" nu mai este disponibil. Elimină-l din coș.` };

  const sellerId = listings[0].seller_id;
  if (listings.some((l) => l.seller_id !== sellerId)) {
    return { error: 'Produsele din aceeași comandă trebuie să fie de la același atelier.' };
  }

  const { data: { user: buyer } } = await supabase.auth.getUser();
  const orderMeta = {
    listing_ids: listings.map((l) => l.id).join(','),
    seller_id: sellerId,
    buyer_id: buyer?.id ?? '',
  };

  const h = await headers();
  const base = h.get('origin') ?? (h.get('host') ? `https://${h.get('host')}` : 'https://craftology-peach.vercel.app');
  const line_items = listings.map((l) => ({
    quantity: 1,
    price_data: {
      currency: 'ron' as const,
      unit_amount: Math.round(Number(l.price) * 100),
      product_data: {
        name: l.title,
        images: (l.image_urls ?? []).filter((u) => typeof u === 'string' && u.startsWith('http')).slice(0, 1),
      },
    },
  }));
  const goodsAmount = line_items.reduce((s, li) => s + li.price_data.unit_amount, 0);
  // One parcel per order → the highest delivery cost among the items, charged
  // once. Computed from the DB, never from the client's cart. It rides as a
  // line item rather than a Stripe shipping rate because we already collected
  // the delivery address ourselves — no need to ask for it twice.
  const shippingAmount = listings.reduce(
    (m, l) => Math.max(m, Math.round(Number(l.shipping_price ?? 0) * 100)),
    0,
  );
  if (shippingAmount > 0) {
    line_items.push({
      quantity: 1,
      price_data: {
        currency: 'ron' as const,
        unit_amount: shippingAmount,
        product_data: { name: 'Livrare', images: [] },
      },
    });
  }

  try {
    const { data: vac } = await supabase
      .from('sellers')
      .select('vacation_until')
      .eq('id', sellerId)
      .maybeSingle();
    if (vac?.vacation_until) {
      const until = new Date(vac.vacation_until + 'T00:00:00');
      if (until > new Date()) {
        const dateRo = until.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
        return { error: `Vânzătorul este momentan în vacanță și nu poate livra. Revine în data de ${dateRo}.` };
      }
    }

    const expires_at = Math.floor(Date.now() / 1000) + 30 * 60;
    const success_url = `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${base}/cart`;
    const common = {
      mode: 'payment' as const,
      line_items,
      customer_email: buyerDetails.email,
      metadata: orderMeta,
      success_url,
      cancel_url,
      expires_at,
    };

    let session;
    if (isPlatformOwner(sellerId)) {
      session = await stripe.checkout.sessions.create(common);
    } else {
      if (!isServiceConfigured()) return { error: 'Plățile pentru vânzători nu sunt configurate complet.' };
      const svc = createServiceClient();
      const { data: seller } = await svc
        .from('sellers')
        .select('stripe_account_id, stripe_onboarded, status')
        .eq('id', sellerId)
        .maybeSingle();
      if (!seller || seller.status !== 'approved' || !seller.stripe_account_id || !seller.stripe_onboarded) {
        return { error: 'Vânzătorul nu poate primi plăți momentan.' };
      }
      session = await stripe.checkout.sessions.create(
        {
          ...common,
          // Commission applies to the goods only — delivery is passed through to
          // the seller, who pays the courier.
          payment_intent_data: { application_fee_amount: Math.round(goodsAmount * COMMISSION_RATE) },
        },
        { stripeAccount: seller.stripe_account_id },
      );
    }

    // Park the invoicing details against the session; the webhook stamps them
    // onto the order rows once the payment lands. Service role because the
    // table is deliberately unreachable from the browser.
    if (isServiceConfigured()) {
      const svc = createServiceClient();
      const { error: cdErr } = await svc.from('checkout_details').upsert(
        {
          stripe_session_id: session.id,
          email: buyerDetails.email,
          full_name: buyerDetails.fullName,
          phone: buyerDetails.phone,
          buyer_type: buyerDetails.buyerType,
          company_name: buyerDetails.companyName || null,
          company_cui: buyerDetails.companyCui || null,
          company_address: buyerDetails.companyAddress || null,
          shipping_address: buyerDetails.shippingAddress,
          // Only offer account creation to guests — a signed-in buyer has one.
          create_account: buyerDetails.createAccount && !buyer,
        },
        { onConflict: 'stripe_session_id' },
      );
      if (cdErr) console.error('checkout_details upsert failed:', cdErr.message);
    }

    return { url: session.url };
  } catch (e) {
    console.error('Stripe cart checkout error:', e);
    return { error: 'Eroare la inițierea plății. Încearcă din nou.' };
  }
}
