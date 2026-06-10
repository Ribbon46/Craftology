'use client';

import Link from 'next/link';
import { BOTTOM_NAV_ITEMS } from '@/config/app';
import { usePathname } from 'next/navigation';
import { Home, Search, Plus, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSlidingIndicator } from '@/lib/use-sliding-indicator';

const ICONS = {
  home: Home,
  search: Search,
  plus: Plus,
  'message-square': MessageSquare,
  user: User,
};

const isItemActive = (href: string, pathname: string) =>
  href === '/' ? pathname === '/' : pathname.startsWith(href);

export function BottomNav() {
  const pathname = usePathname();

  // Active tab among the four non-plus items (the center "+ Vinde" is an action,
  // not a tab, so it never carries the indicator).
  const activeHref =
    BOTTOM_NAV_ITEMS.find((i) => i.icon !== 'plus' && isItemActive(i.href, pathname))?.href ?? null;
  const { containerRef, register, pill } = useSlidingIndicator<HTMLDivElement>(activeHref);

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-paper/95 backdrop-blur-md border-t border-line z-50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div ref={containerRef} className="relative flex justify-around items-center h-16 px-2">
        {/* Sliding liquid-glass pill behind the active tab */}
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-2xl bg-clay/10 dark:bg-clay/20 ring-1 ring-clay/20 backdrop-blur-sm"
          style={{
            left: pill.left + 6,
            top: pill.top + 8,
            width: pill.width - 12,
            height: pill.height - 16,
            opacity: pill.ready ? 1 : 0,
            transition: pill.animate
              ? 'left .5s cubic-bezier(.22,1,.36,1), width .5s cubic-bezier(.22,1,.36,1), opacity .3s ease'
              : 'opacity .3s ease',
          }}
        />
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS];
          const isActive = isItemActive(item.href, pathname);

          // Center "+ Vinde" is a raised clay action button (Vinted-style).
          if (item.icon === 'plus') {
            return (
              <Link key={item.id} href={item.href} aria-label={item.label} className="relative z-10 flex flex-col items-center -mt-6">
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
              ref={register(item.href)}
              className={cn(
                'relative z-10 flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors duration-300',
                isActive ? 'text-clay' : 'text-ink-soft hover:text-ink',
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
