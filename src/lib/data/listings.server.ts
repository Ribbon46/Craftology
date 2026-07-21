import 'server-only';
import { cache } from 'react';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '@/lib/supabase/config';
import { Listing, MOCK_LISTINGS, findMockListing } from '@/lib/mock';
import type { ListingsPage } from '@/lib/data/listings';

// Server-side reads for SSR/ISR. Uses a COOKIELESS anon client on purpose:
// listings/profiles are world-readable (public RLS), so no session is needed,
// and not touching cookies() lets these pages be statically cached + revalidated
// instead of being forced dynamic. Mirrors the browser data layer's SELECT +
// mock fallback (kept local to avoid importing the 'use client' Supabase client
// into a server-only module). `import type` above is erased at build, so no
// browser client is pulled in.

// Matches the home feed's default block size (owner spec: blocks of 25).
const PAGE_SIZE = 25;

const SELECT =
  'id, title, description, price, original_price, category, subcategory, image_urls, seller_id, status, created_at, ' +
  'profiles:profiles!listings_seller_id_fkey ( id, username, full_name, avatar_url, rating )';

function isRealCategory(category?: string): category is string {
  return !!category && category !== 'all';
}

function anon() {
  return createAnonClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** One listing by id. `cache()` dedupes the call within a single request
 *  (so generateMetadata + the page body share one query). */
export const fetchListingByIdServer = cache(async (id: string): Promise<Listing | null> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await anon().from('listings').select(SELECT).eq('id', id).single();
      if (!error && data) return data as unknown as Listing;
    } catch {
      // fall through to mock
    }
  }
  return findMockListing(id);
});

/** First (or any) page of active listings, server-side, for SSR + ISR. */
export async function fetchListingsPageServer(
  opts: { cursor?: number | null; category?: string } = {},
): Promise<ListingsPage> {
  const offset = opts.cursor ?? 0;

  if (isSupabaseConfigured()) {
    try {
      let query = anon()
        .from('listings')
        .select(SELECT, { count: 'exact' })
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (isRealCategory(opts.category)) query = query.eq('category', opts.category);

      const { data, error, count } = await query;
      if (!error && data) {
        const rows = data as unknown as Listing[];
        return { data: rows, nextCursor: rows.length === PAGE_SIZE ? offset + PAGE_SIZE : null, total: count };
      }
    } catch {
      // fall through to mock
    }
  }

  const filtered = isRealCategory(opts.category)
    ? MOCK_LISTINGS.filter((l) => l.category === opts.category)
    : MOCK_LISTINGS;
  const slice = filtered.slice(offset, offset + PAGE_SIZE);
  return { data: slice, nextCursor: offset + PAGE_SIZE < filtered.length ? offset + PAGE_SIZE : null, total: filtered.length };
}

export interface SellerPublic {
  id: string;
  company_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_other: string | null;
  status: string;
  vacation_until: string | null;
}

/** Public seller info (company + contact methods) for buyer display on a
 *  listing. RLS exposes these columns only for `approved` sellers to anon. */
export async function fetchSellerPublicById(id: string): Promise<SellerPublic | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await anon()
        .from('sellers')
        .select('id, company_name, contact_email, contact_phone, contact_other, status, vacation_until')
        .eq('id', id)
        .maybeSingle();
      if (!error && data) return data as SellerPublic;
    } catch {
      // fall through
    }
  }
  return null;
}

/** Active listing ids + timestamps, for the sitemap. */
export async function fetchListingIdsServer(): Promise<Array<{ id: string; created_at: string }>> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await anon()
        .from('listings')
        .select('id, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (!error && data) return data as Array<{ id: string; created_at: string }>;
    } catch {
      // fall through to mock
    }
  }
  return MOCK_LISTINGS.map((l) => ({ id: l.id, created_at: l.created_at }));
}
