import { NextRequest, NextResponse, after } from 'next/server';
import crypto from 'crypto';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Shopify → Craft'zaar product sync. A "Product creation" webhook (added in
// Shopify Admin → Settings → Notifications → Webhooks) posts here; we verify
// the HMAC, ACK within Shopify's 5s window, then mirror the product (photos
// included) into the shop's Craft'zaar catalog via after().
//
// Env: SHOPIFY_WEBHOOK_SECRET (signing secret from the Shopify webhooks page),
//      SHOPIFY_SELLER_ID (optional; defaults to the Deco Kubik shop account).
const SELLER_ID = process.env.SHOPIFY_SELLER_ID ?? '282b8cb8-9d0c-4501-bdd4-2b171f68037e';
const MAX_IMAGES = 10;

interface ShopifyProduct {
  title?: string;
  body_html?: string;
  status?: string;
  product_type?: string;
  variants?: Array<{ price?: string; compare_at_price?: string | null }>;
  images?: Array<{ src?: string; position?: number }>;
}

const stripHtml = (s: string) =>
  s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

function svc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function importProduct(p: ShopifyProduct) {
  const db = svc();
  if (!db) return;
  const title = (p.title ?? '').trim().slice(0, 100);
  const description = stripHtml(p.body_html ?? '').slice(0, 3000);
  const price = Math.round(parseFloat(p.variants?.[0]?.price ?? '0'));
  const cmpRaw = p.variants?.[0]?.compare_at_price;
  const cmp = cmpRaw ? Math.round(parseFloat(cmpRaw)) : null;
  if (!title || description.length < 20 || price < 1) {
    console.log('shopify sync: skipped (invalid fields):', title);
    return;
  }
  if (p.status && p.status !== 'active') {
    console.log('shopify sync: skipped (not active):', title);
    return;
  }

  // Dedup by title, same rule as the CSV importer (webhook retries are safe).
  const { data: existing } = await db
    .from('listings')
    .select('id')
    .eq('seller_id', SELLER_ID)
    .ilike('title', title)
    .maybeSingle();
  if (existing) {
    console.log('shopify sync: skipped (duplicate title):', title);
    return;
  }

  const type = (p.product_type ?? '').toLowerCase();
  const subcategory = type.includes('bijuter') ? 'Bijuterii' : 'Decorațiuni';
  const category = subcategory === 'Bijuterii' ? 'Accesorii' : 'Home';

  const sources = (p.images ?? [])
    .filter((i) => i.src)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    .slice(0, MAX_IMAGES);
  const urls: string[] = [];
  for (const img of sources) {
    try {
      const u = img.src! + (img.src!.includes('?') ? '&' : '?') + 'width=1600';
      const resp = await fetch(u, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) continue;
      const buf = Buffer.from(await resp.arrayBuffer());
      const jpeg = await sharp(buf).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
      const path = `listings/${SELLER_ID}/${crypto.randomUUID()}.jpg`;
      const { error } = await db.storage.from('listings_images').upload(path, jpeg, { contentType: 'image/jpeg' });
      if (!error) urls.push(db.storage.from('listings_images').getPublicUrl(path).data.publicUrl);
    } catch {
      // one bad image shouldn't kill the sync
    }
  }
  if (urls.length === 0) {
    console.log('shopify sync: skipped (no images):', title);
    return;
  }

  const { error: insErr } = await db.from('listings').insert({
    seller_id: SELLER_ID,
    title,
    description,
    price,
    original_price: cmp && cmp > price ? cmp : null,
    category,
    subcategory,
    image_urls: urls,
    status: 'active',
  });
  if (insErr) {
    console.error('shopify sync insert error:', insErr.message);
    return;
  }
  console.log('shopify sync: imported:', title, `(${urls.length} images)`);
  revalidatePath('/');
}

export async function POST(req: NextRequest) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ note: 'shopify sync not configured' });

  const rawBody = await req.text();
  const hmac = req.headers.get('x-shopify-hmac-sha256') ?? '';
  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  const valid =
    hmac.length > 0 &&
    hmac.length === digest.length &&
    crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
  if (!valid) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });

  const topic = req.headers.get('x-shopify-topic') ?? '';
  if (topic !== 'products/create') return NextResponse.json({ received: true, note: `ignored topic ${topic}` });

  let product: ShopifyProduct;
  try {
    product = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  // ACK immediately (Shopify retries after ~5s); mirror the product after.
  after(() => importProduct(product));
  return NextResponse.json({ received: true });
}
