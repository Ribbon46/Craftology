'use server';

import { createServerClient } from '@/lib/supabase/server';

// Wishlist (favorites) — registered users only. RLS restricts every operation
// to the caller's own rows, and ids are derived from the session, never trusted
// from the client beyond the listing id itself.

export interface WishlistItem {
  listing_id: string;
  created_at: string;
  listings: {
    id: string;
    title: string;
    price: number;
    image_urls: string[] | null;
    status: string;
    category: string;
  } | null;
}

/** Whether the current user has saved this listing (false for guests). */
export async function getWishlistState(listingId: string): Promise<{ saved: boolean }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { saved: false };
  const { data } = await supabase
    .from('wishlist')
    .select('listing_id')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .maybeSingle();
  return { saved: !!data };
}

/** Save/unsave a listing. Returns the new state. */
export async function toggleWishlist(listingId: string): Promise<{ saved: boolean } | { error: string }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Autentificare necesară' };

  const { data: existing } = await supabase
    .from('wishlist')
    .select('listing_id')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('wishlist').delete().eq('user_id', user.id).eq('listing_id', listingId);
    if (error) return { error: 'Nu am putut actualiza favoritele.' };
    return { saved: false };
  }
  const { error } = await supabase.from('wishlist').insert({ user_id: user.id, listing_id: listingId });
  if (error) {
    if (error.code === '23505') return { saved: true }; // double-tap race — already saved
    return { error: 'Nu am putut salva la favorite.' };
  }
  return { saved: true };
}

/** The current user's saved listings, newest first. */
export async function getMyWishlist(): Promise<WishlistItem[]> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('wishlist')
    .select('listing_id, created_at, listings ( id, title, price, image_urls, status, category )')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return (data as unknown as WishlistItem[]) ?? [];
}
