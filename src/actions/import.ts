'use server';

import sharp from 'sharp';
import { createServerClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { isPlatformOwner } from '@/lib/owner';
import { listingFormSchema } from '@/schemas/listing';
import { SUBCATEGORY_PARENT } from '@/config/app';
import { revalidatePath } from 'next/cache';

// Catalog import (CSV) for sellers. Accepts BOTH the Craft'zaar template
// (titlu,descriere,pret,pret_vechi,categorie,subcategorie,imagini) and a raw
// Shopify product export (auto-detected). Images are downloaded from an
// allowlist of known CDN hosts (SSRF guard), resized, and mirrored into our
// storage. Caps keep one run inside serverless time limits.
const MAX_PRODUCTS_PER_RUN = 20;
const MAX_IMAGES_PER_PRODUCT = 6;
const ALLOWED_IMAGE_HOSTS = [
  'cdn.shopify.com',
  'i.etsystatic.com',
  'static.wixstatic.com',
  'images.squarespace-cdn.com',
  'i.imgur.com',
  'lh3.googleusercontent.com',
];

interface RowResult {
  row: number;
  title: string;
  ok: boolean;
  reason?: string;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const stripHtml = (s: string) =>
  s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

function hostAllowed(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

interface Draft {
  row: number;
  title: string;
  description: string;
  price: number;
  originalPrice: number | null;
  category: string;
  subcategory: string;
  images: string[];
}

/** Map rows into product drafts for either supported format. */
function extractDrafts(rows: string[][]): { drafts: Draft[]; skipped: RowResult[] } | { error: string } {
  const head = rows[0].map((h) => h.trim());
  const skipped: RowResult[] = [];
  const drafts: Draft[] = [];

  if (head.includes('Handle') && head.includes('Body (HTML)')) {
    // Shopify export: rows grouped by Handle, one image per row.
    const col = (n: string) => head.indexOf(n);
    const H = col('Handle'), T = col('Title'), B = col('Body (HTML)'), TYPE = col('Type'),
      P = col('Variant Price'), CMP = col('Variant Compare At Price'), IMG = col('Image Src'),
      POS = col('Image Position'), PUB = col('Published');
    const byHandle = new Map<string, { row: number; title: string; body: string; type: string; price: number | null; cmp: number | null; pub: string; images: Array<{ src: string; pos: number }> }>();
    rows.slice(1).forEach((r, i) => {
      const h = r[H];
      if (!h) return;
      if (!byHandle.has(h)) byHandle.set(h, { row: i + 2, title: '', body: '', type: '', price: null, cmp: null, pub: '', images: [] });
      const p = byHandle.get(h)!;
      if (r[T]) p.title = r[T];
      if (r[B]) p.body = r[B];
      if (TYPE >= 0 && r[TYPE]) p.type = r[TYPE];
      if (PUB >= 0 && r[PUB]) p.pub = r[PUB];
      if (r[P] && p.price == null) p.price = parseFloat(r[P]);
      if (CMP >= 0 && r[CMP] && p.cmp == null) p.cmp = parseFloat(r[CMP]);
      if (IMG >= 0 && r[IMG]) p.images.push({ src: r[IMG], pos: parseInt(r[POS] || '99', 10) || 99 });
    });
    for (const p of byHandle.values()) {
      if (p.pub && p.pub.toLowerCase() !== 'true') {
        skipped.push({ row: p.row, title: p.title, ok: false, reason: 'nepublicat în export' });
        continue;
      }
      const type = (p.type || '').toLowerCase();
      const subcategory = type.includes('bijuter') ? 'Bijuterii' : 'Decorațiuni';
      drafts.push({
        row: p.row,
        title: p.title.slice(0, 100),
        description: stripHtml(p.body).slice(0, 3000),
        price: Math.round(p.price ?? 0),
        originalPrice: p.cmp && p.price && p.cmp > p.price ? Math.round(p.cmp) : null,
        category: SUBCATEGORY_PARENT[subcategory] ?? 'Accesorii',
        subcategory,
        images: p.images.sort((a, b) => a.pos - b.pos).map((x) => x.src),
      });
    }
    return { drafts, skipped };
  }

  if (head.includes('titlu') && head.includes('pret')) {
    const col = (n: string) => head.indexOf(n);
    const T = col('titlu'), D = col('descriere'), P = col('pret'), OP = col('pret_vechi'),
      C = col('categorie'), S = col('subcategorie'), I = col('imagini');
    rows.slice(1).forEach((r, i) => {
      const op = OP >= 0 && r[OP] ? parseFloat(r[OP]) : null;
      const price = parseFloat(r[P] ?? '');
      drafts.push({
        row: i + 2,
        title: (r[T] ?? '').trim().slice(0, 100),
        description: (r[D] ?? '').trim().slice(0, 3000),
        price: Math.round(price || 0),
        originalPrice: op && op > price ? Math.round(op) : null,
        category: (r[C] ?? '').trim(),
        subcategory: (r[S] ?? '').trim(),
        images: (r[I] ?? '').split('|').map((s) => s.trim()).filter(Boolean),
      });
    });
    return { drafts, skipped };
  }

  return { error: 'Format necunoscut. Folosește modelul Craft\'zaar sau un export de produse Shopify.' };
}

export async function importCatalog(csvText: string): Promise<
  { imported: number; results: RowResult[] } | { error: string }
> {
  if (!csvText || csvText.length > 3 * 1024 * 1024) return { error: 'Fișier CSV invalid sau prea mare (max 3MB).' };

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Autentificare necesară' };

  // Same eligibility as createListing: owner, or approved + onboarded seller.
  if (!isPlatformOwner(user.id)) {
    const { data: seller } = await supabase.from('sellers').select('status, stripe_onboarded').eq('id', user.id).maybeSingle();
    if (!seller || seller.status !== 'approved') return { error: 'Trebuie să fii vânzător aprobat pentru a importa produse.' };
    if (!seller.stripe_onboarded) return { error: 'Finalizează configurarea plăților (Stripe) înainte de a importa.' };
  }

  const rl = await checkRateLimit('listing', user.id);
  if (!rl.ok) return { error: 'Prea multe operații într-un timp scurt. Încearcă mai târziu.' };

  const rows = parseCSV(csvText);
  if (rows.length < 2) return { error: 'Fișierul CSV nu conține produse.' };
  const extracted = extractDrafts(rows);
  if ('error' in extracted) return extracted;
  const { drafts, skipped } = extracted;

  if (drafts.length === 0) return { error: 'Nu am găsit produse de importat în fișier.' };
  if (drafts.length > MAX_PRODUCTS_PER_RUN) {
    return { error: `Maximum ${MAX_PRODUCTS_PER_RUN} produse per import. Împarte fișierul în mai multe bucăți (fișierul are ${drafts.length}).` };
  }

  // Skip duplicates by exact title (re-running the same file must be safe).
  const { data: existing } = await supabase.from('listings').select('title').eq('seller_id', user.id);
  const existingTitles = new Set(((existing ?? []) as Array<{ title: string }>).map((l) => l.title.trim().toLowerCase()));

  const results: RowResult[] = [...skipped];
  let imported = 0;

  for (const d of drafts) {
    if (existingTitles.has(d.title.trim().toLowerCase())) {
      results.push({ row: d.row, title: d.title, ok: false, reason: 'există deja un produs cu acest titlu' });
      continue;
    }
    const v = listingFormSchema.safeParse({
      title: d.title, description: d.description, price: d.price, category: d.category, subcategory: d.subcategory,
    });
    if (!v.success) {
      results.push({ row: d.row, title: d.title, ok: false, reason: Object.values(v.error.flatten().fieldErrors).flat()[0] ?? 'date invalide' });
      continue;
    }
    const sources = d.images.filter(hostAllowed).slice(0, MAX_IMAGES_PER_PRODUCT);
    if (sources.length === 0) {
      results.push({ row: d.row, title: d.title, ok: false, reason: 'nicio imagine validă (gazdă nepermisă sau lipsă)' });
      continue;
    }

    const urls: string[] = [];
    for (const src of sources) {
      try {
        const resp = await fetch(src, { signal: AbortSignal.timeout(12000) });
        if (!resp.ok) continue;
        const buf = Buffer.from(await resp.arrayBuffer());
        if (buf.length > 20 * 1024 * 1024) continue;
        const jpeg = await sharp(buf).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
        const path = `listings/${user.id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from('listings_images').upload(path, jpeg, { contentType: 'image/jpeg' });
        if (upErr) continue;
        const { data: pub } = supabase.storage.from('listings_images').getPublicUrl(path);
        if (pub?.publicUrl) urls.push(pub.publicUrl);
      } catch {
        // one bad image shouldn't kill the product — continue with the rest
      }
    }
    if (urls.length === 0) {
      results.push({ row: d.row, title: d.title, ok: false, reason: 'imaginile nu au putut fi descărcate' });
      continue;
    }

    const { error: insErr } = await supabase.from('listings').insert({
      seller_id: user.id,
      title: v.data.title,
      description: v.data.description,
      price: v.data.price,
      original_price: d.originalPrice,
      category: v.data.category,
      subcategory: v.data.subcategory,
      image_urls: urls,
      status: 'active',
    });
    if (insErr) {
      results.push({ row: d.row, title: d.title, ok: false, reason: 'eroare la salvare' });
      continue;
    }
    existingTitles.add(d.title.trim().toLowerCase());
    imported++;
    results.push({ row: d.row, title: d.title, ok: true });
  }

  if (imported > 0) revalidatePath('/');
  return { imported, results };
}
