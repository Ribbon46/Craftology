'use server';

import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Admins are configured via ADMIN_USER_IDS (comma-separated profile ids).
// Defaults to the founding Deco Kubik owner so the panel works out of the box;
// set ADMIN_USER_IDS in env to use your own account(s).
function adminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? '3f6538a6-af42-48fe-99b3-56ed9fbcaf08')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function serviceConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// Service-role client: bypasses RLS so an admin can read all applications and
// change `status` (which normal users are barred from writing). Server-only.
function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function isAdminUser(): Promise<boolean> {
  const id = await currentUserId();
  return !!id && adminIds().includes(id);
}

export async function listSellerApplications() {
  if (!(await isAdminUser())) return { error: 'Acces interzis' };
  if (!serviceConfigured()) return { error: 'Indisponibil: lipsește SUPABASE_SERVICE_ROLE_KEY.' };
  const { data, error } = await adminClient()
    .from('sellers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { error: error.message };
  return { sellers: data ?? [] };
}

export async function reviewSeller(
  sellerId: string,
  action: 'approve' | 'reject' | 'suspend',
  reason?: string,
) {
  if (!(await isAdminUser())) return { error: 'Acces interzis' };
  if (!serviceConfigured()) return { error: 'Indisponibil: lipsește SUPABASE_SERVICE_ROLE_KEY.' };

  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'suspended';
  const { error } = await adminClient()
    .from('sellers')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      rejection_reason: action === 'reject' ? reason?.trim() || 'Cerere respinsă.' : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sellerId);

  if (error) return { error: error.message };
  revalidatePath('/admin/sellers');
  return { success: true };
}
