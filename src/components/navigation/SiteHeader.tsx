'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Plus } from 'lucide-react';
import { APP_NAME } from '@/config/app';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Acasă' },
  { href: '/search', label: 'Caută' },
  { href: '/messages', label: 'Mesaje' },
  { href: '/profile', label: 'Profil' },
];

// Adaptive header: a compact brand bar on phones (bottom tab bar handles nav),
// a full storefront nav on desktop (brand · links · search · Vinde).
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 w-full bg-paper/85 backdrop-blur-md border-b border-line"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto w-full max-w-6xl flex items-center gap-6 px-5 lg:px-8 h-16 lg:h-[72px]">
        <Link href="/" className="flex flex-col leading-none shrink-0">
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">{APP_NAME}</span>
          <span className="text-[10px] uppercase tracking-[0.28em] text-clay/80 mt-0.5">by Deco Kubik</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-7 mx-auto">
          {NAV.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative text-sm tracking-wide transition-colors py-1',
                  active ? 'text-ink' : 'text-ink-soft hover:text-ink',
                )}
              >
                {link.label}
                {active && <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-clay" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          <Link
            href="/search"
            aria-label="Căutare"
            className="grid place-items-center w-10 h-10 rounded-full border border-line bg-surface text-ink-soft hover:text-clay hover:border-clay/40 transition-colors"
          >
            <Search className="w-[18px] h-[18px]" />
          </Link>
          <Link
            href="/sell"
            className="hidden lg:inline-flex items-center gap-1.5 rounded-full bg-clay text-paper px-5 py-2.5 text-sm font-medium hover:bg-clay-deep transition-colors"
          >
            <Plus className="w-4 h-4" />
            Vinde
          </Link>
        </div>
      </div>
    </header>
  );
}
