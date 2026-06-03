// Data-access layer for listings. Reads from Supabase when configured,
// otherwise serves the shared mock dataset — so the UI code is identical in
// demo mode and live mode, and the app "goes live" the moment real keys land.

import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { Listing, MOCK_LISTINGS, findMockListing, SellerProfile } from '@/lib/mock';

const PAGE_SIZE = 20;

// Embeds the seller profile via the explicit FK so the join is unambiguous.
const SELECT =
  'id, title, description, price, category, image_urls, seller_id, status, created_at, ' +
  'profiles:profiles!listings_seller_id_fkey ( id, username, full_name, avatar_url, rating )';

export interface ListingsPage {
  data: Listing[];
  nextCursor: number | null;
}

function isRealCategory(category?: string): category is string {
  return !!category && category !== 'all';
}

export async function fetchListingsPage(
  opts: { cursor?: number | null; category?: string } = {},
): Promise<ListingsPage> {
  const offset = opts.cursor ?? 0;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      let query = supabase
        .from('listings')
        .select(SELECT)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (isRealCategory(opts.category)) query = query.eq('category', opts.category);

      const { data, error } = await query;
      if (!error && data) {
        const rows = data as unknown as Listing[];
        return { data: rows, nextCursor: rows.length === PAGE_SIZE ? offset + PAGE_SIZE : null };
      }
    } catch {
      // fall through to mock
    }
  }

  const filtered = isRealCategory(opts.category)
    ? MOCK_LISTINGS.filter((l) => l.category === opts.category)
    : MOCK_LISTINGS;
  const slice = filtered.slice(offset, offset + PAGE_SIZE);
  return { data: slice, nextCursor: offset + PAGE_SIZE < filtered.length ? offset + PAGE_SIZE : null };
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('listings').select(SELECT).eq('id', id).single();
      if (!error && data) return data as unknown as Listing;
    } catch {
      // fall through to mock
    }
  }
  return findMockListing(id);
}

export async function searchListings(query: string, category?: string): Promise<Listing[]> {
  const term = query.trim();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      let q = supabase
        .from('listings')
        .select(SELECT)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);
      if (isRealCategory(category)) q = q.eq('category', category);
      if (term) q = q.ilike('title', `%${term}%`);

      const { data, error } = await q;
      if (!error && data) return data as unknown as Listing[];
    } catch {
      // fall through to mock
    }
  }

  let list = isRealCategory(category) ? MOCK_LISTINGS.filter((l) => l.category === category) : MOCK_LISTINGS;
  if (term) {
    const lower = term.toLowerCase();
    list = list.filter((l) => l.title.toLowerCase().includes(lower));
  }
  return list;
}

/** All listings for one seller (their profile page). */
export async function fetchSellerListings(sellerId: string): Promise<Listing[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('listings')
        .select(SELECT)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as unknown as Listing[];
    } catch {
      // fall through to mock
    }
  }
  return MOCK_LISTINGS.filter((l) => l.seller_id === sellerId);
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
