'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowLeft, Check, CheckCheck, MessageSquare } from 'lucide-react';
import { createMessage, getMessages, getConversations, markMessagesAsRead } from '@/actions/messages';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { avatarFor } from '@/lib/mock';

interface UiMessage {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: string;
  isRead: boolean;
}

interface UiConversation {
  id: string;
  otherName: string;
  otherAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  listingTitle: string;
}

const MOCK_CONVERSATIONS: UiConversation[] = [
  { id: '1', otherName: 'Andrei Popescu', otherAvatar: avatarFor('Andrei Popescu'), lastMessage: 'Este produsul încă disponibil?', lastMessageTime: '10:30', unreadCount: 2, listingTitle: 'Colier Mărgele Colorate' },
  { id: '2', otherName: 'Maria Ionescu', otherAvatar: avatarFor('Maria Ionescu'), lastMessage: 'Mulțumesc pentru livrare rapidă!', lastMessageTime: 'Ieri', unreadCount: 0, listingTitle: 'Pantofi Piele Artizanal' },
  { id: '3', otherName: 'Cristi Vasilescu', otherAvatar: avatarFor('Cristi Vasilescu'), lastMessage: 'Pot plăti la livrare?', lastMessageTime: 'Luni', unreadCount: 0, listingTitle: 'Lumânare artizanală' },
];

const MOCK_MESSAGES: UiMessage[] = [
  { id: '1', text: 'Bună! Este produsul încă disponibil?', sender: 'them', timestamp: '10:25', isRead: true },
  { id: '2', text: 'Da, este încă disponibil. Vrei să-l comanzi?', sender: 'me', timestamp: '10:28', isRead: true },
  { id: '3', text: 'Perfect, îl iau!', sender: 'them', timestamp: '10:30', isRead: false },
];

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

export default function MessagesPage() {
  const { user, loading: sessionLoading } = useSession();
  const { setOpen } = useAuthModal();
  const live = isSupabaseConfigured();

  const [conversations, setConversations] = useState<UiConversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation list (real when configured + signed in, else mock demo).
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!live) {
        if (active) { setConversations(MOCK_CONVERSATIONS); setLoadingConvs(false); }
        return;
      }
      if (sessionLoading) return;
      if (!user) {
        if (active) { setConversations([]); setLoadingConvs(false); }
        return;
      }
      try {
        const res = await getConversations(user.id);
        if (!active) return;
        if ('success' in res && res.success) {
          setConversations(
            (res.conversations as any[]).map((c) => {
              const other = c.buyer_id === user.id ? c.seller : c.buyer;
              return {
                id: c.id,
                otherName: other?.full_name || other?.username || 'Utilizator',
                otherAvatar: other?.avatar_url ?? null,
                lastMessage: c.last_message_text ?? '',
                lastMessageTime: fmtTime(c.last_message_at ?? c.updated_at),
                unreadCount: c.unread_count ?? 0,
                listingTitle: c.listings?.title ?? '',
              };
            }),
          );
        } else {
          setConversations([]);
        }
      } catch {
        if (active) setConversations([]);
      } finally {
        if (active) setLoadingConvs(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [live, user, sessionLoading]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleConversationSelect = async (conversationId: string) => {
    setSelectedConversation(conversationId);
    if (!live || !user) {
      setMessages(MOCK_MESSAGES);
      return;
    }
    try {
      const res = await getMessages(conversationId);
      if ('success' in res && res.success) {
        setMessages(
          (res.messages as any[]).map((m) => ({
            id: m.id,
            text: m.text,
            sender: m.sender_id === user.id ? 'me' : 'them',
            timestamp: fmtTime(m.created_at),
            isRead: !!m.read,
          })),
        );
      } else {
        setMessages([]);
      }
      // Mark the other party's messages read + clear the badge locally.
      markMessagesAsRead(conversationId).catch(() => {});
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
    } catch {
      setMessages([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text) return;

    const optimistic: UiMessage = {
      id: `tmp-${messages.length + 1}`,
      text,
      sender: 'me',
      timestamp: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
      isRead: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage('');

    if (live && user && selectedConversation) {
      await createMessage(selectedConversation, text);
    } else {
      // Demo mode: simulate a reply.
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1000);
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  // ---- Chat thread view ----
  if (selectedConversation) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] mx-auto w-full max-w-3xl">
        <div className="flex items-center px-4 py-3 border-b border-line bg-surface">
          <button
            onClick={() => setSelectedConversation(null)}
            className="p-2 -ml-2 rounded-full hover:bg-cream text-ink-soft"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center ml-2">
            <img
              src={selectedConv?.otherAvatar ?? avatarFor(selectedConv?.otherName ?? 'Utilizator')}
              alt={selectedConv?.otherName}
              className="w-10 h-10 rounded-full mr-3"
            />
            <div>
              <h3 className="font-semibold text-ink">{selectedConv?.otherName}</h3>
              {selectedConv?.listingTitle && (
                <p className="text-xs text-ink-soft">{selectedConv.listingTitle}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 bg-cream space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-ink-faint pt-8">Niciun mesaj încă. Scrie primul!</p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.sender === 'me'
                    ? 'bg-ink text-paper rounded-tr-none shadow-sm'
                    : 'bg-surface text-ink rounded-tl-none border border-line shadow-sm'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <div className="flex items-center justify-end mt-1 space-x-1">
                  <span className={`text-[10px] ${msg.sender === 'me' ? 'text-line-strong' : 'text-ink-faint'}`}>
                    {msg.timestamp}
                  </span>
                  {msg.sender === 'me' &&
                    (msg.isRead ? (
                      <CheckCheck className="w-3 h-3 text-line-strong" />
                    ) : (
                      <Check className="w-3 h-3 text-line-strong" />
                    ))}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-surface border border-line rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-ink-faint rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-ink-faint rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-ink-faint rounded-full animate-bounce delay-150" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 py-3 bg-surface border-t border-line">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Scrie un mesaj…"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-cream border-line focus:ring-2 focus:ring-ink"
            />
            <Button type="submit" size="icon" className="rounded-full bg-ink hover:bg-ink text-paper" disabled={!newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ---- Signed-out gate (live mode only — demo mode shows mock conversations) ----
  if (live && !sessionLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-clay-soft grid place-items-center mb-4">
          <MessageSquare className="w-7 h-7 text-clay" />
        </div>
        <h1 className="font-display text-2xl text-ink mb-2">Mesajele tale</h1>
        <p className="text-ink-soft mb-6 max-w-xs">Autentifică-te pentru a vedea conversațiile cu vânzătorii.</p>
        <Button className="w-full max-w-xs rounded-full" onClick={() => setOpen(true)}>
          Autentificare
        </Button>
      </div>
    );
  }

  // ---- Inbox view ----
  return (
    <div className="min-h-screen pb-20 pt-4 mx-auto w-full max-w-3xl">
      <div className="px-4 mb-4">
        <h1 className="font-display text-2xl text-ink">Mesaje</h1>
        <p className="text-sm text-ink-soft mt-1">Conversațiile tale cu cumpărătorii și vânzătorii</p>
      </div>

      {loadingConvs || sessionLoading ? (
        <div className="px-4 divide-y divide-line" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-cream animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-cream animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-cream animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-clay-soft grid place-items-center mb-4">
            <MessageSquare className="w-7 h-7 text-clay" />
          </div>
          <h3 className="font-display text-lg text-ink mb-1.5">Nicio conversație încă.</h3>
          <p className="text-sm text-ink-soft max-w-xs">
            Contactează un vânzător de pe pagina unui produs pentru a începe.
          </p>
        </div>
      ) : (
        <div className="px-4 divide-y divide-line">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleConversationSelect(conv.id)}
              className="w-full text-left flex items-start gap-3 py-4 transition-colors hover:bg-surface/60 active:bg-surface rounded-lg px-2 -mx-2"
            >
              <img
                src={conv.otherAvatar ?? avatarFor(conv.otherName)}
                alt={conv.otherName}
                className="w-12 h-12 rounded-full flex-shrink-0 ring-1 ring-line"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <h3 className={`truncate ${conv.unreadCount > 0 ? 'font-semibold text-ink' : 'font-medium text-ink'}`}>
                    {conv.otherName}
                  </h3>
                  <span className={`text-xs flex-shrink-0 ${conv.unreadCount > 0 ? 'font-medium text-clay' : 'text-ink-faint'}`}>
                    {conv.lastMessageTime}
                  </span>
                </div>
                {conv.listingTitle && (
                  <p className="text-xs text-ink-faint truncate mb-0.5">{conv.listingTitle}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-ink' : 'text-ink-soft'}`}>
                    {conv.lastMessage || 'Deschide conversația'}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="flex items-center justify-center min-w-5 h-5 px-1.5 bg-clay text-paper text-[11px] font-semibold rounded-full flex-shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
