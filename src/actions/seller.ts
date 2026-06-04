'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface SellerRow {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  company_name: string;
  cui: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_other: string | null;
  workshop_description: string | null;
  rejection_reason: string | null;
  stripe_onboarded: boolean;
  created_at: string;
}

const SELLER_COLS =
  'id, status, company_name, cui, contact_email, contact_phone, contact_other, workshop_description, rejection_reason, stripe_onboarded, created_at';

/** The current user's own seller row (their application), or null. */
export async function getMySeller(): Promise<{ authed: boolean; seller: SellerRow | null }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authed: false, seller: null };
  const { data } = await supabase.from('sellers').select(SELLER_COLS).eq('id', user.id).maybeSingle();
  return { authed: true, seller: (data as SellerRow) ?? null };
}

/** Submit a seller application. The seller must be a persoană juridică (company
 *  + CUI) and must accept the Terms; the row is created as `pending`. */
export async function applyAsSeller(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Autentificare necesară' };

  const companyName = String(formData.get('company_name') ?? '').trim();
  const cui = String(formData.get('cui') ?? '').trim();
  const contactEmail = String(formData.get('contact_email') ?? '').trim();
  const contactPhone = String(formData.get('contact_phone') ?? '').trim();
  const contactOther = String(formData.get('contact_other') ?? '').trim();
  const workshop = String(formData.get('workshop_description') ?? '').trim();
  const accepted = formData.get('accept_terms');
  const acceptedTerms = accepted === 'on' || accepted === 'true';

  if (companyName.length < 2) return { error: 'Completează denumirea firmei.' };
  if (cui.length < 2) return { error: 'Completează CUI-ul (codul fiscal al firmei).' };
  if (!contactEmail && !contactPhone) {
    return { error: 'Adaugă cel puțin un mod de contact (email sau telefon).' };
  }
  if (!acceptedTerms) {
    return { error: 'Trebuie să accepți Termenii și Politica de confidențialitate pentru a continua.' };
  }

  const { data: existing } = await supabase.from('sellers').select('status').eq('id', user.id).maybeSingle();
  if (existing) {
    return { error: 'Ai deja o cerere înregistrată.' };
  }

  const { error: insErr } = await supabase.from('sellers').insert({
    id: user.id,
    company_name: companyName,
    cui,
    contact_email: contactEmail || null,
    contact_phone: contactPhone || null,
    contact_other: contactOther || null,
    workshop_description: workshop || null,
    terms_accepted_at: new Date().toISOString(),
    // status defaults to 'pending'; Stripe/review fields stay server-controlled.
  });
  if (insErr) {
    if (insErr.code === '23505') return { error: 'Ai deja o cerere înregistrată.' };
    return { error: `Eroare la trimiterea cererii: ${insErr.message}` };
  }

  revalidatePath('/seller/apply');
  return { success: true };
}
