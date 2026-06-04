'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Updates the signed-in user's own profile. RLS + the column grant from the
 * security pass restrict this to username / full_name / avatar_url on the
 * caller's own row (rating stays server-controlled).
 */
export async function updateProfile(formData: FormData) {
  const supabase = await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Autentificare necesară' };
  }

  const username = String(formData.get('username') ?? '').trim();
  const fullName = String(formData.get('full_name') ?? '').trim();

  if (username.length < 3) {
    return { error: 'Numele de utilizator trebuie să aibă cel puțin 3 caractere' };
  }
  if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
    return { error: 'Numele de utilizator poate conține doar litere, cifre, _ și .' };
  }

  const update: { username: string; full_name: string | null; avatar_url?: string } = {
    username,
    full_name: fullName || null,
  };

  // Optional avatar upload (stored under the user's own folder — allowed by the
  // storage RLS policy). Reuses the raster-only whitelist.
  const avatar = formData.get('avatar');
  if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > 5 * 1024 * 1024) {
      return { error: 'Avatarul este prea mare (max 5MB).' };
    }
    const ext = ALLOWED_IMAGE_TYPES[avatar.type];
    if (!ext) {
      return { error: 'Avatar: format invalid. Acceptăm JPG, PNG, WEBP sau GIF.' };
    }
    const path = `listings/${user.id}/avatar-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('listings_images')
      .upload(path, avatar, { contentType: avatar.type, upsert: false });
    if (upErr) {
      return { error: `Eroare la încărcarea avatarului: ${upErr.message}` };
    }
    const { data: { publicUrl } } = supabase.storage.from('listings_images').getPublicUrl(path);
    update.avatar_url = publicUrl;
  }

  const { error: updErr } = await supabase.from('profiles').update(update).eq('id', user.id);
  if (updErr) {
    if (updErr.code === '23505' || /duplicate|unique/i.test(updErr.message)) {
      return { error: 'Acest nume de utilizator este deja folosit.' };
    }
    return { error: `Eroare la actualizarea profilului: ${updErr.message}` };
  }

  revalidatePath('/profile');
  return { success: true };
}
