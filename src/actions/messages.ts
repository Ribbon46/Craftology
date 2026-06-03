'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createConversation(buyerId: string, sellerId: string, listingId: string) {
  const supabase = await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Autentificare necesară' };
  }

  // A buyer can't open a conversation with themselves.
  if (buyerId === sellerId) {
    return { error: 'Nu poți începe o conversație cu tine însuți' };
  }

  // Reuse an existing thread for this (buyer, seller, listing) pair, in either role order.
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .or(`and(buyer_id.eq.${buyerId},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${buyerId})`)
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

  const trimmed = text.trim();
  if (!trimmed) {
    return { error: 'Mesajul nu poate fi gol' };
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

  return { success: true, conversations: conversations ?? [] };
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
