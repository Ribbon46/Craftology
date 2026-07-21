// Data-access layer for listings. Reads from Supabase when configured,
// otherwise serves the shared mock dataset — so the UI code is identical in
// demo mode and live mode, and the app "goes live" the moment real keys land.

import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { Listing, MOCK_LISTINGS, findMockListing, SellerProfile } from '@/lib/mock';

const PAGE_SIZE = 20;

// Embeds the seller profile via the explicit FK so the join is unambiguous.
const SELECT =
  'id, title, description, price, original_price, category, subcategory, image_urls, seller_id, status, created_at, ' +
  'profiles:profiles!listings_seller_id_fkey ( id, username, full_name, avatar_url, rating )';

export interface ListingsPage {
  data: Listing[];
  nextCursor: number | null;
  /** Total matching rows (first page only) — drives "N produse disponibile". */
  total?: number | null;
}

function isRealCategory(category?: string): category is string {
  return !!category && category !== 'all';
}

export type SortOption = 'newest' | 'price_asc' | 'price_desc';

function sortListings(list: Listing[], sort: SortOption): Listing[] {
  const arr = [...list];
  if (sort === 'price_asc') return arr.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') return arr.sort((a, b) => b.price - a.price);
  return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function fetchListingsPage(
  opts: {
    cursor?: number | null;
    category?: string;
    subcategory?: string;
    sort?: SortOption;
    minPrice?: number;
    maxPrice?: number;
    sellerId?: string;
    /** Block size (owner spec: 25/50/100; default PAGE_SIZE). */
    limit?: number;
  } = {},
): Promise<ListingsPage> {
  const offset = opts.cursor ?? 0;
  const sort = opts.sort ?? 'newest';
  const pageSize = opts.limit ?? PAGE_SIZE;

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    // Filters first (FilterBuilder), then ordering (TransformBuilder), then range.
    let fq = supabase.from('listings').select(SELECT, { count: 'exact' }).eq('status', 'active');
    if (isRealCategory(opts.category)) fq = fq.eq('category', opts.category);
    if (opts.subcategory) fq = fq.eq('subcategory', opts.subcategory);
    if (opts.minPrice != null) fq = fq.gte('price', opts.minPrice);
    if (opts.maxPrice != null) fq = fq.lte('price', opts.maxPrice);
    if (opts.sellerId) fq = fq.eq('seller_id', opts.sellerId);
    const ordered =
      sort === 'price_asc'
        ? fq.order('price', { ascending: true }).order('created_at', { ascending: false })
        : sort === 'price_desc'
          ? fq.order('price', { ascending: false }).order('created_at', { ascending: false })
          : fq.order('created_at', { ascending: false });

    const { data, error, count } = await ordered.range(offset, offset + pageSize - 1);
    // Live mode: a failed read THROWS (React Query retries / keeps previous
    // data) — never silently serve the fake demo catalog to real users.
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Listing[];
    return { data: rows, nextCursor: rows.length === pageSize ? offset + pageSize : null, total: count };
  }

  let filtered = isRealCategory(opts.category)
    ? MOCK_LISTINGS.filter((l) => l.category === opts.category)
    : [...MOCK_LISTINGS];
  if (opts.subcategory) filtered = filtered.filter((l) => l.subcategory === opts.subcategory);
  if (opts.minPrice != null) filtered = filtered.filter((l) => l.price >= opts.minPrice!);
  if (opts.maxPrice != null) filtered = filtered.filter((l) => l.price <= opts.maxPrice!);
  filtered = sortListings(filtered, sort);
  const slice = filtered.slice(offset, offset + pageSize);
  return { data: slice, nextCursor: offset + pageSize < filtered.length ? offset + pageSize : null, total: filtered.length };
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data, error } = await supabase.from('listings').select(SELECT).eq('id', id).maybeSingle();
    if (error) throw new Error(error.message); // live read failure ≠ "not found"
    return (data as unknown as Listing) ?? null;
  }
  return findMockListing(id);
}

export async function searchListings(
  query: string,
  category?: string,
  sort: SortOption = 'newest',
  subcategory?: string,
  sellerId?: string,
): Promise<Listing[]> {
  const term = query.trim();

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    let q = supabase.from('listings').select(SELECT).eq('status', 'active');
    if (isRealCategory(category)) q = q.eq('category', category);
    if (subcategory) q = q.eq('subcategory', subcategory);
    if (sellerId) q = q.eq('seller_id', sellerId);
    if (term) q = q.ilike('title', `%${term}%`);
    const ordered =
      sort === 'price_asc'
        ? q.order('price', { ascending: true })
        : sort === 'price_desc'
          ? q.order('price', { ascending: false })
          : q.order('created_at', { ascending: false });

    const { data, error } = await ordered.limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Listing[];
  }

  let list = isRealCategory(category) ? MOCK_LISTINGS.filter((l) => l.category === category) : [...MOCK_LISTINGS];
  if (subcategory) list = list.filter((l) => l.subcategory === subcategory);
  if (term) {
    const lower = term.toLowerCase();
    list = list.filter((l) => l.title.toLowerCase().includes(lower));
  }
  return sortListings(list, sort);
}

/** All listings for one seller (their profile page). */
export async function fetchSellerListings(sellerId: string): Promise<Listing[]> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('listings')
      .select(SELECT)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Listing[];
  }
  return MOCK_LISTINGS.filter((l) => l.seller_id === sellerId);
}

/** Distinct artisans that currently have active listings (for the filter). */
export interface ArtisanOption {
  id: string;
  name: string;
}
export async function fetchArtisans(): Promise<ArtisanOption[]> {
  if (!isSupabaseConfigured()) {
    const seen = new Map<string, string>();
    for (const l of MOCK_LISTINGS) if (l.profiles) seen.set(l.seller_id, l.profiles.full_name || l.profiles.username);
    return [...seen].map(([id, name]) => ({ id, name }));
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from('listings')
    .select('seller_id, profiles:profiles!listings_seller_id_fkey ( full_name, username )')
    .eq('status', 'active')
    .limit(1000);
  if (error) throw new Error(error.message);
  const seen = new Map<string, string>();
  for (const row of (data ?? []) as unknown as Array<{ seller_id: string; profiles: { full_name: string | null; username: string } | null }>) {
    if (!seen.has(row.seller_id)) seen.set(row.seller_id, row.profiles?.full_name || row.profiles?.username || 'Artizan');
  }
  return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'ro'));
}

/** A single profile row (the signed-in user's own profile). */
export async function fetchProfile(userId: string): Promise<SellerProfile | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, rating')
        .eq('id', userId)
        .single();
      if (!error && data) return data as unknown as SellerProfile;
    } catch {
      // fall through
    }
  }
  return null;
}
