'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Store, Flag, Receipt, BadgeCheck, type LucideIcon } from 'lucide-react';
import { getAdminStats } from '@/actions/admin';

interface Stats {
  pendingSellers: number;
  approvedSellers: number;
  openReports: number;
  paidOrders: number;
  gmvBani: number;
}

const fmt = (bani: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(bani / 100);

function StatTile({
  label,
  value,
  href,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | undefined;
  href: string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border-[1.5px] p-4 shadow-[3px_3px_0_0_var(--press-soft)] transition-transform ease-pop hover:-translate-x-px hover:-translate-y-px ${
        accent ? 'border-clay/45 bg-clay-soft/40' : 'border-line-strong bg-surface'
      }`}
    >
      <Icon className={`w-5 h-5 mb-2 ${accent ? 'text-clay' : 'text-ink-soft'}`} />
      <div className="font-display text-2xl text-ink">{value ?? '—'}</div>
      <div className="text-xs text-ink-soft">{label}</div>
    </Link>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getAdminStats()
      .then((r) => {
        if ('stats' in r && r.stats) setStats(r.stats);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink mb-5">Panou administrare</h1>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatTile label="Cereri vânzători noi" value={stats?.pendingSellers} href="/admin/sellers" icon={Store} accent={!!stats && stats.pendingSellers > 0} />
        <StatTile label="Sesizări noi" value={stats?.openReports} href="/admin/reports" icon={Flag} accent={!!stats && stats.openReports > 0} />
        <StatTile label="Vânzători activi" value={stats?.approvedSellers} href="/admin/sellers" icon={BadgeCheck} />
        <StatTile label="Comenzi plătite" value={stats?.paidOrders} href="/admin/orders" icon={Receipt} />
      </div>
      <div className="rounded-2xl border-[1.5px] border-line-strong bg-surface shadow-[4px_4px_0_0_var(--press-soft)] p-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-faint mb-1">Vânzări totale (brut)</p>
        <p className="price text-3xl font-semibold text-ink">{stats ? `${fmt(stats.gmvBani)} lei` : '…'}</p>
      </div>
    </div>
  );
}
