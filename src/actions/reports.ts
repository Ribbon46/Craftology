'use server';

import { createServerClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ratelimit';
import { REPORT_REASONS, type ReportReason } from '@/config/app';

type Reason = ReportReason;
const REASON_VALUES = REPORT_REASONS.map((r) => r.value) as readonly string[];

/**
 * File a report against a product or a seller. Private — only admins read
 * reports (via the service-role client). ids derived/validated server-side.
 */
export async function submitReport(input: {
  targetType: 'listing' | 'seller';
  listingId?: string;
  sellerId?: string;
  reason: Reason;
  details?: string;
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Autentificare necesară' };
  if (!REASON_VALUES.includes(input.reason)) return { error: 'Motiv invalid' };

  const rl = await checkRateLimit('report', user.id);
  if (!rl.ok) return { error: 'Ai trimis prea multe raportări într-un timp scurt. Încearcă mai târziu.' };

  const listingId = input.targetType === 'listing' ? input.listingId : undefined;
  let sellerId = input.sellerId ?? null;
  if (input.targetType === 'listing') {
    // A listing report MUST name the listing; the seller is derived from it
    // (never trusted from the client). Otherwise it could be misattributed.
    if (!listingId) return { error: 'Țintă invalidă.' };
    const { data: listing } = await supabase.from('listings').select('seller_id').eq('id', listingId).maybeSingle();
    if (!listing) return { error: 'Produsul nu a fost găsit.' };
    sellerId = listing.seller_id as string;
  }
  if (!sellerId) return { error: 'Țintă invalidă.' };
  if (sellerId === user.id) return { error: 'Nu te poți raporta pe tine.' };

  const details = input.details?.trim().slice(0, 1000) || null;
  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: input.targetType,
    listing_id: listingId ?? null,
    seller_id: sellerId,
    reason: input.reason,
    details,
  });

  if (error) {
    if (error.code === '23505') return { error: 'Ai raportat deja acest element.' };
    return { error: 'Nu am putut trimite raportarea. Încearcă din nou.' };
  }
  return { success: true };
}
