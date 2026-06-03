'use client';

import Link from 'next/link';
import { BOTTOM_NAV_ITEMS } from '@/config/app';
import { usePathname } from 'next/navigation';
import { Home, Search, Plus, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  home: Home,
  search: Search,
  plus: Plus,
  'message-square': MessageSquare,
  user: User,
};

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-paper/95 backdrop-blur-md border-t border-line z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-around items-center h-16 px-2">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS];
          const isActive = pathname === item.href;

          // Center "+ Vinde" is a raised clay action button (Vinted-style).
          if (item.icon === 'plus') {
            return (
              <Link key={item.id} href={item.href} aria-label={item.label} className="flex flex-col items-center -mt-6">
                <span className="grid place-items-center w-[52px] h-[52px] rounded-full bg-clay text-paper shadow-atelier ring-4 ring-paper transition-transform active:scale-95">
                  <Icon size={24} strokeWidth={2.25} />
                </span>
                <span className="text-[10px] mt-1 font-medium text-clay">{item.label.replace('+ ', '')}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors',
                isActive ? 'text-ink' : 'text-ink-faint hover:text-ink-soft',
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
