'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';

export function TopNav() {
  return (
    <nav
      className="sticky top-0 z-50 w-full bg-paper/85 backdrop-blur-md border-b border-line"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center justify-between px-5 h-16">
        <Link href="/" className="group flex flex-col leading-none">
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">
            Craftology
          </span>
          <span className="text-[10px] uppercase tracking-[0.28em] text-clay/80 mt-0.5">
            by Deco Kubik
          </span>
        </Link>
        <Link
          href="/search"
          aria-label="Căutare"
          className="grid place-items-center w-10 h-10 -mr-1 rounded-full border border-line bg-surface text-ink-soft hover:text-clay hover:border-clay/40 transition-colors"
        >
          <Search className="w-[18px] h-[18px]" />
        </Link>
      </div>
    </nav>
  );
}
