'use server';

import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient, isServiceConfigured } from '@/lib/supabase/admin';

/**
 * Follow state for a seller: whether the current user follows them + the public
 * follower count. The follows table is row-restricted (a user sees only their
 * own follows), so the public count is read with the service-role client.
 */
export async function getFollowState(sellerId: string): Promise<{ following: boolean; count: number }> {
  const supabase = await createServerClient();

  let count = 0;
  if (isServiceConfigured()) {
    const { count: c } = await createServiceClient()
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId);
    count = c ?? 0;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let following = false;
  if (user) {
    const { data } = await supabase
      .from('follows')
      .select('seller_id')
      .eq('seller_id', sellerId)
      .eq('follower_id', user.id)
      .maybeSingle();
    following = !!data;
  }

  return { following, count };
}

export interface FollowedArtisan {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  verified: boolean;
  followed_at: string;
  active_count: number;
  /** First image of up to three of their newest active products. */
  thumbs: string[];
}

/**
 * The artisans the current user follows (profile → "Urmăriți"), newest first,
 * each with a peek at what they're selling now. The follow rows are the
 * caller's own (RLS); profiles, approved sellers and listings are public.
 */
export async function getMyFollows(): Promise<FollowedArtisan[]> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: follows } = await supabase
      .from('follows')
      .select('seller_id, created_at')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false });
    const rows = (follows ?? []) as Array<{ seller_id: string; created_at: string }>;
    if (rows.length === 0) return [];
    const ids = rows.map((f) => f.seller_id);

    const [{ data: profiles }, { data: sellers }, { data: listings }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', ids),
      supabase.from('sellers').select('id, company_name, status').in('id', ids),
      supabase
        .from('listings')
        .select('seller_id, image_urls')
        .in('seller_id', ids)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1000),
    ]);

    const profileById = new Map(
      ((profiles ?? []) as Array<{ id: string; full_name: string | null; username: string | null; avatar_url: string | null }>).map(
        (p) => [p.id, p],
      ),
    );
    const sellerById = new Map(
      ((sellers ?? []) as Array<{ id: string; company_name: string | null; status: string }>).map((s) => [s.id, s]),
    );
    const bySeller = new Map<string, { count: number; thumbs: string[] }>();
    for (const l of (listings ?? []) as Array<{ seller_id: string; image_urls: string[] | null }>) {
      const agg = bySeller.get(l.seller_id) ?? { count: 0, thumbs: [] };
      agg.count += 1;
      if (agg.thumbs.length < 3 && l.image_urls?.[0]) agg.thumbs.push(l.image_urls[0]);
      bySeller.set(l.seller_id, agg);
    }

    return rows.map((f) => {
      const p = profileById.get(f.seller_id);
      const s = sellerById.get(f.seller_id);
      const agg = bySeller.get(f.seller_id);
      return {
        id: f.seller_id,
        name: s?.company_name || p?.full_name || p?.username || 'Atelier',
        username: p?.username ?? null,
        avatar_url: p?.avatar_url ?? null,
        verified: s?.status === 'approved',
        followed_at: f.created_at,
        active_count: agg?.count ?? 0,
        thumbs: agg?.thumbs ?? [],
      };
    });
  } catch {
    return [];
  }
}

/**
 * Follow / unfollow a seller (toggles). Returns the new state. ids are derived
 * from the session — the client never supplies follower_id.
 */
export async function toggleFollow(
  sellerId: string,
): Promise<{ following: boolean } | { error: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Autentificare necesară' };
  if (user.id === sellerId) return { error: 'Nu te poți urmări pe tine.' };

  const { data: existing } = await supabase
    .from('follows')
    .select('seller_id')
    .eq('seller_id', sellerId)
    .eq('follower_id', user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('seller_id', sellerId)
      .eq('follower_id', user.id);
    if (error) return { error: 'Nu am putut actualiza. Încearcă din nou.' };
    return { following: false };
  }

  const { error } = await supabase.from('follows').insert({ seller_id: sellerId, follower_id: user.id });
  if (error) return { error: 'Nu am putut actualiza. Încearcă din nou.' };
  return { following: true };
}
