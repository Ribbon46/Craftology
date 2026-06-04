'use server';

import { createServerClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { revalidatePath } from 'next/cache';

export async function createConversation(listingId: string) {
  const supabase = await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Autentificare necesară' };
  }

  const rl = await checkRateLimit('conversation', user.id);
  if (!rl.ok) return { error: 'Prea multe conversații noi. Încearcă din nou peste un minut.' };

  // Never trust client-supplied participant ids. The buyer is ALWAYS the
  // authenticated caller; the seller is whoever actually owns the listing.
  // (This closes the spoofing gap where a caller could name a victim as the
  // other party, or pair a listing with a seller who doesn't own it.)
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, seller_id')
    .eq('id', listingId)
    .single();

  if (listingError || !listing) {
    return { error: 'Produsul nu a fost găsit' };
  }

  const buyerId = user.id;
  const sellerId = listing.seller_id;

  if (buyerId === sellerId) {
    return { error: 'Nu poți începe o conversație cu propriul anunț' };
  }

  // Reuse the existing thread for this (buyer, seller, listing) triple.
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .eq('seller_id', sellerId)
    .maybeSingle();

  if (existing) {
    return { success: true, conversationId: existing.id };
  }

  const { data: newConversation, error: createError } = await supabase
    .from('conversations')
    .insert({ buyer_id: buyerId, seller_id: sellerId, listing_id: listingId })
    .select('id')
    .single();

  if (createError || !newConversation) {
    return { error: `Eroare la crearea conversației: ${createError?.message ?? 'necunoscută'}` };
  }

  revalidatePath('/messages');
  return { success: true, conversationId: newConversation.id };
}

export async function createMessage(conversationId: string, text: string) {
  const supabase = await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Autentificare necesară' };
  }

  const rl = await checkRateLimit('message', user.id);
  if (!rl.ok) return { error: 'Trimiți mesaje prea repede. Așteaptă un minut.' };

  const trimmed = text.trim();
  if (!trimmed) {
    return { error: 'Mesajul nu poate fi gol' };
  }
  if (trimmed.length > 2000) {
    return { error: 'Mesajul este prea lung (max 2000 de caractere)' };
  }

  // Verify the sender is a participant in the conversation.
  const { data: conversation, error: checkError } = await supabase
    .from('conversations')
    .select('buyer_id, seller_id')
    .eq('id', conversationId)
    .single();

  if (checkError || !conversation) {
    return { error: 'Conversația nu a fost găsită' };
  }

  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    return { error: 'Nu aveți permisiunea să trimiteți mesaje în această conversație' };
  }

  const { data: newMessage, error: createError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, text: trimmed })
    .select('id, text, sender_id, created_at')
    .single();

  if (createError) {
    return { error: `Eroare la trimiterea mesajului: ${createError.message}` };
  }

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  revalidatePath('/messages');
  return { success: true, message: newMessage };
}

export async function getMessages(conversationId: string, limit: number = 50) {
  const supabase = await createServerClient();

  // Defense-in-depth beyond RLS: require an authenticated participant before
  // returning any messages (so a leaked/edited policy can't become an IDOR).
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Autentificare necesară' };
  }
  const { data: convo, error: convoError } = await supabase
    .from('conversations')
    .select('buyer_id, seller_id')
    .eq('id', conversationId)
    .single();
  if (convoError || !convo) {
    return { error: 'Conversația nu a fost găsită' };
  }
  if (convo.buyer_id !== user.id && convo.seller_id !== user.id) {
    return { error: 'Nu aveți permisiunea să vedeți această conversație' };
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, text, sender_id, created_at, read, sender:profiles!sender_id ( id, username, avatar_url, full_name )')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    return { error: `Eroare la primirea mesajelor: ${error.message}` };
  }

  return { success: true, messages: messages ?? [] };
}

export async function getConversations(userId: string) {
  const supabase = await createServerClient();

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      updated_at,
      buyer:profiles!buyer_id ( id, username, avatar_url, full_name ),
      seller:profiles!seller_id ( id, username, avatar_url, full_name ),
      listings!inner ( id, title, image_urls, status )
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error) {
    return { error: `Eroare la primirea conversațiilor: ${error.message}` };
  }

  const convos = (conversations ?? []) as Array<{ id: string }>;
  if (convos.length === 0) return { success: true, conversations: [] };

  // Enrich each conversation with its last message + unread count. RLS limits
  // the messages query to conversations the user participates in (which is
  // exactly the ones listed), so one batched query is safe and sufficient.
  const ids = convos.map((c) => c.id);
  const { data: msgs } = await supabase
    .from('messages')
    .select('conversation_id, text, created_at, sender_id, read')
    .in('conversation_id', ids)
    .order('created_at', { ascending: true });

  const last = new Map<string, { text: string; at: string }>();
  const unread = new Map<string, number>();
  for (const m of (msgs ?? []) as Array<{ conversation_id: string; text: string; created_at: string; sender_id: string; read: boolean }>) {
    last.set(m.conversation_id, { text: m.text, at: m.created_at }); // asc → last write wins
    if (!m.read && m.sender_id !== userId) {
      unread.set(m.conversation_id, (unread.get(m.conversation_id) ?? 0) + 1);
    }
  }

  const enriched = convos.map((c) => ({
    ...c,
    last_message_text: last.get(c.id)?.text ?? null,
    last_message_at: last.get(c.id)?.at ?? null,
    unread_count: unread.get(c.id) ?? 0,
  }));

  return { success: true, conversations: enriched };
}

export async function markMessagesAsRead(conversationId: string) {
  const supabase = await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Autentificare necesară' };
  }

  // Mark every message NOT sent by the current user as read.
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id);

  if (error) {
    return { error: `Eroare: ${error.message}` };
  }

  revalidatePath('/messages');
  return { success: true };
}
