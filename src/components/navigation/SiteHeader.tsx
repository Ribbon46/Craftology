'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Plus, Sun, Moon, LogIn } from 'lucide-react';
import { APP_NAME } from '@/config/app';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/theme';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';

const NAV = [
  { href: '/', label: 'Acasă' },
  { href: '/search', label: 'Caută' },
  { href: '/messages', label: 'Mesaje' },
  { href: '/profile', label: 'Profil' },
];

// Adaptive header: a compact brand bar on phones (bottom tab bar handles nav),
// a full storefront nav on desktop (brand · links · search · Vinde). Theme
// toggle + dedicated auth control live on the right on every size.
export function SiteHeader() {
  const pathname = usePathname();
  const { toggle } = useTheme();
  const { user } = useSession();
  const { setOpen } = useAuthModal();

  const initial =
    (user?.user_metadata?.full_name as string | undefined)?.charAt(0) ||
    user?.email?.charAt(0) ||
    'C';

  return (
    <header
      className="sticky top-0 z-50 w-full bg-paper/85 backdrop-blur-md border-b border-line"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto w-full max-w-6xl flex items-center gap-4 lg:gap-6 px-4 sm:px-5 lg:px-8 h-16 lg:h-[72px]">
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
          {/* Theme toggle — icons are pure CSS off the .dark class (no hydration flash) */}
          <button
            type="button"
            onClick={toggle}
            aria-label="Comută tema"
            title="Comută tema deschisă / întunecată"
            className="grid place-items-center w-10 h-10 rounded-full border border-line bg-surface text-ink-soft hover:text-clay hover:border-clay/40 transition-colors"
          >
            <Moon className="w-[18px] h-[18px] dark:hidden" />
            <Sun className="w-[18px] h-[18px] hidden dark:block" />
          </button>

          {/* Search — desktop only (phones use the bottom tab bar) */}
          <Link
            href="/search"
            aria-label="Căutare"
            className="hidden lg:grid place-items-center w-10 h-10 rounded-full border border-line bg-surface text-ink-soft hover:text-clay hover:border-clay/40 transition-colors"
          >
            <Search className="w-[18px] h-[18px]" />
          </Link>

          {/* Dedicated auth control: account avatar when signed in, else a
              log-in / sign-up button that opens the modal (which offers both). */}
          {user ? (
            <Link
              href="/profile"
              aria-label="Contul meu"
              className="grid place-items-center w-10 h-10 rounded-full bg-clay text-paper font-display text-sm font-semibold ring-1 ring-clay/40 hover:bg-clay-deep transition-colors"
            >
              {initial.toUpperCase()}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-clay/45 text-clay px-3.5 py-2 text-sm font-medium hover:bg-clay hover:text-paper hover:border-clay transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Conectează-te</span>
            </button>
          )}

          {/* Vinde — desktop only */}
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
