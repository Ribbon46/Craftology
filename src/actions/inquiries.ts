'use server';

import { createServiceClient, isServiceConfigured } from '@/lib/supabase/admin';
import { sendEmail, isEmailConfigured, escapeHtml, ADMIN_NOTIFY_EMAIL } from '@/lib/email';
import { checkRateLimit } from '@/lib/ratelimit';

/**
 * Guest product inquiry: a visitor (no account) asks the seller a question.
 * The platform RELAYS it by email — the seller's contact details stay hidden
 * from the buyer (owner's privacy rule), and the seller can reply directly to
 * the guest via reply-to. Rate-limited per email address.
 */
export async function sendGuestInquiry(
  listingId: string,
  fromEmail: string,
  message: string,
): Promise<{ success: true } | { error: string }> {
  const email = fromEmail.trim().toLowerCase();
  const text = message.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: 'Adresa de email nu pare validă.' };
  if (text.length < 10) return { error: 'Scrie un mesaj de cel puțin 10 caractere.' };
  if (text.length > 1000) return { error: 'Mesajul poate avea maximum 1000 de caractere.' };
  if (!isServiceConfigured()) return { error: 'Indisponibil momentan.' };
  if (!isEmailConfigured()) return { error: 'Trimiterea mesajelor nu este disponibilă momentan.' };

  const rl = await checkRateLimit('conversation', `guest:${email}`);
  if (!rl.ok) return { error: 'Ai trimis prea multe mesaje. Încearcă mai târziu.' };

  const svc = createServiceClient();
  const { data: listing } = await svc
    .from('listings')
    .select('id, title, seller_id')
    .eq('id', listingId)
    .maybeSingle();
  if (!listing) return { error: 'Produsul nu a fost găsit.' };

  // Seller's email: their application contact, falling back to their auth email.
  const { data: seller } = await svc
    .from('sellers')
    .select('contact_email, company_name')
    .eq('id', listing.seller_id)
    .maybeSingle();
  let to = seller?.contact_email ?? null;
  if (!to) {
    const { data: u } = await svc.auth.admin.getUserById(listing.seller_id);
    to = u?.user?.email ?? null;
  }
  if (!to) return { error: 'Vânzătorul nu poate fi contactat momentan.' };

  const res = await sendEmail({
    to,
    replyTo: email,
    subject: `Întrebare despre „${listing.title}" — Craft'zaar`,
    html: `<h2>Ai o întrebare de la un vizitator Craft'zaar</h2>
      <p><b>Produs:</b> ${escapeHtml(listing.title)}<br>
      <b>De la:</b> ${escapeHtml(email)}</p>
      <blockquote style="border-left:3px solid #b9572f;margin:0;padding:6px 12px;color:#444">${escapeHtml(text).replace(/\n/g, '<br>')}</blockquote>
      <p>Răspunde direct la acest email (Reply) și mesajul ajunge la cumpărător.</p>
      <p style="color:#8a7a66;font-size:12px">Trimis prin formularul „Trimite mesaj" de pe pagina produsului tău.</p>`,
  });
  if ('error' in res || 'skipped' in res) return { error: 'Mesajul nu a putut fi trimis. Încearcă din nou.' };

  // Copy the admin inbox so the platform can spot abuse (fire-and-forget).
  sendEmail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `[copie] Întrebare vizitator → ${seller?.company_name ?? 'vânzător'}: ${listing.title}`,
    html: `<p>De la ${escapeHtml(email)}:</p><blockquote>${escapeHtml(text)}</blockquote>`,
  }).catch(() => {});

  return { success: true };
}
