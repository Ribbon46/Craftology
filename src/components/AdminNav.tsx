'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, Flag, Receipt, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/admin', label: 'Panou', icon: LayoutDashboard, exact: true },
  { href: '/admin/sellers', label: 'Vânzători', icon: Store },
  { href: '/admin/reports', label: 'Sesizări', icon: Flag },
  { href: '/admin/orders', label: 'Comenzi', icon: Receipt },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="mb-6">
      <Link href="/profile" className="inline-flex items-center text-sm text-ink-soft hover:text-ink mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Înapoi în aplicație
      </Link>
      <nav className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {ITEMS.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap border-[1.5px] transition-colors',
                active
                  ? 'bg-clay text-paper border-edge'
                  : 'border-line-strong text-ink-soft hover:text-clay hover:border-clay/40',
              )}
            >
              <Icon className="w-4 h-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
