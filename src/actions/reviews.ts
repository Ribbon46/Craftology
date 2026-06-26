'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { reviewSchema, type ReviewInput } from '@/schemas/review';

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { username: string | null; full_name: string | null; avatar_url: string | null } | null;
}

const REVIEW_SELECT =
  'id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey ( username, full_name, avatar_url )';

/** May this buyer review the seller? Requires a real paid/refunded ORDER from
 *  them with that seller (for a product review, an order for that listing) —
 *  not merely a conversation, which anyone can open (review-bomb vector). The
 *  RLS WITH CHECK re-verifies this (incl. an email match for guest-then-member
 *  buyers); here we check the buyer_id orders the cookie client can read. */
async function hasInteracted(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  sellerId: string,
  listingId?: string,
): Promise<boolean> {
  let q = supabase
    .from('orders')
    .select('id')
    .eq('seller_id', sellerId)
    .eq('buyer_id', userId)
    .in('status', ['paid', 'refunded'])
    .limit(1);
  if (listingId) q = q.eq('listing_id', listingId);
  const { data } = await q;
  return !!data && data.length > 0;
}

/** Product reviews for a listing (newest first). */
export async function getListingReviews(listingId: string): Promise<PublicReview[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });
  return (data as unknown as PublicReview[]) ?? [];
}

/** All reviews a seller has received (for their profile "Recenzii" tab). */
export async function getSellerReviews(sellerId: string): Promise<PublicReview[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  return (data as unknown as PublicReview[]) ?? [];
}

/** Whether the current user may review this seller/listing (drives the form). */
export async function canReview(
  sellerId: string,
  listingId?: string,
): Promise<{ canReview: boolean; alreadyReviewed: boolean }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id === sellerId) return { canReview: false, alreadyReviewed: false };

  const eligible = await hasInteracted(supabase, user.id, sellerId, listingId);
  if (!eligible) return { canReview: false, alreadyReviewed: false };

  // Already left this review?
  let q = supabase.from('reviews').select('id').eq('reviewer_id', user.id).eq('seller_id', sellerId).limit(1);
  q = listingId ? q.eq('listing_id', listingId) : q.is('listing_id', null);
  const { data: existing } = await q;
  return { canReview: !(existing && existing.length > 0), alreadyReviewed: !!(existing && existing.length > 0) };
}

export async function submitReview(input: ReviewInput): Promise<{ success: true } | { error: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Autentificare necesară' };

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Date invalide' };
  const { listingId, rating, comment } = parsed.data;

  const rl = await checkRateLimit('review', user.id);
  if (!rl.ok) return { error: 'Ai trimis prea multe recenzii într-un timp scurt. Încearcă mai târziu.' };

  // Never trust a client-supplied seller_id: for a product review derive it
  // from the listing. For a pure seller review, use the provided sellerId.
  let sellerId = parsed.data.sellerId ?? null;
  if (listingId) {
    const { data: listing } = await supabase.from('listings').select('seller_id').eq('id', listingId).maybeSingle();
    if (!listing) return { error: 'Produsul nu a fost găsit.' };
    sellerId = listing.seller_id as string;
  }
  if (!sellerId) return { error: 'Lipsește vânzătorul.' };
  if (sellerId === user.id) return { error: 'Nu îți poți lăsa o recenzie ție însuți.' };

  const eligible = await hasInteracted(supabase, user.id, sellerId, listingId);
  if (!eligible) return { error: 'Poți lăsa o recenzie doar după ce ai cumpărat de la acest vânzător.' };

  const { error } = await supabase.from('reviews').insert({
    reviewer_id: user.id,
    seller_id: sellerId,
    listing_id: listingId ?? null,
    rating,
    comment: comment && comment.length > 0 ? comment : null,
  });

  if (error) {
    if (error.code === '23505') return { error: 'Ai lăsat deja o recenzie.' };
    return { error: 'Nu am putut salva recenzia. Încearcă din nou.' };
  }

  if (listingId) revalidatePath(`/listings/${listingId}`);
  return { success: true };
}
