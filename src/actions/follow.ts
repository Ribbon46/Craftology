'use server';

import { createServerClient } from '@/lib/supabase/server';

/**
 * Follow state for a seller: whether the current user follows them + the public
 * follower count. Reads only (no auth required for the count).
 */
export async function getFollowState(sellerId: string): Promise<{ following: boolean; count: number }> {
  const supabase = await createServerClient();

  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', sellerId);

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

  return { following, count: count ?? 0 };
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
