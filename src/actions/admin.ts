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

// ---- Reports triage (admin-only; reports table is otherwise private) ----

export async function listReports() {
  if (!(await isAdminUser())) return { error: 'Acces interzis' };
  if (!serviceConfigured()) return { error: 'Indisponibil: lipsește SUPABASE_SERVICE_ROLE_KEY.' };
  const { data, error } = await adminClient()
    .from('reports')
    .select(
      'id, target_type, reason, details, status, created_at, listing_id, seller_id, ' +
        'listings ( title ), seller:profiles!reports_seller_id_fkey ( username, full_name )',
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return { error: error.message };
  return { reports: data ?? [] };
}

export async function setReportStatus(reportId: string, status: 'reviewed' | 'dismissed' | 'open') {
  if (!(await isAdminUser())) return { error: 'Acces interzis' };
  if (!serviceConfigured()) return { error: 'Indisponibil: lipsește SUPABASE_SERVICE_ROLE_KEY.' };
  if (!['reviewed', 'dismissed', 'open'].includes(status)) return { error: 'Status invalid' };
  const { error } = await adminClient().from('reports').update({ status }).eq('id', reportId);
  if (error) return { error: error.message };
  revalidatePath('/admin/reports');
  return { success: true };
}

// ---- Admin dashboard data ----

export async function getAdminStats() {
  if (!(await isAdminUser())) return { error: 'Acces interzis' };
  if (!serviceConfigured()) return { error: 'Indisponibil: lipsește SUPABASE_SERVICE_ROLE_KEY.' };
  const a = adminClient();
  const [pendingSellers, approvedSellers, openReports, paidOrders, gmvRows] = await Promise.all([
    a.from('sellers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    a.from('sellers').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    a.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    a.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
    a.from('orders').select('amount_total').eq('status', 'paid'),
  ]);
  const gmvBani = ((gmvRows.data ?? []) as Array<{ amount_total: number }>).reduce((s, o) => s + (o.amount_total ?? 0), 0);
  return {
    stats: {
      pendingSellers: pendingSellers.count ?? 0,
      approvedSellers: approvedSellers.count ?? 0,
      openReports: openReports.count ?? 0,
      paidOrders: paidOrders.count ?? 0,
      gmvBani,
    },
  };
}

/** Recent signups for the admin dashboard (email + confirmation status). Reads
 *  auth.users via the service-role admin API (not exposed to normal clients). */
export async function listRecentUsers(): Promise<
  { users: Array<{ id: string; email: string | null; created_at: string; confirmed: boolean }> } | { error: string }
> {
  if (!(await isAdminUser())) return { error: 'Acces interzis' };
  if (!serviceConfigured()) return { error: 'Indisponibil: lipsește SUPABASE_SERVICE_ROLE_KEY.' };
  const { data, error } = await adminClient().auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) return { error: error.message };
  const users = data.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at ?? '',
      confirmed: !!u.email_confirmed_at,
    }))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { users };
}

export async function listAllOrders() {
  if (!(await isAdminUser())) return { error: 'Acces interzis' };
  if (!serviceConfigured()) return { error: 'Indisponibil: lipsește SUPABASE_SERVICE_ROLE_KEY.' };
  const { data, error } = await adminClient()
    .from('orders')
    .select(
      'id, listing_id, buyer_email, amount_total, status, cancelled_by, created_at, seller_id, ' +
        'listings ( title ), seller:profiles!orders_seller_id_fkey ( username, full_name )',
    )
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return { error: error.message };
  return { orders: data ?? [] };
}
