'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Search, Plus, Sun, Moon, LogIn, ShoppingBag } from 'lucide-react';
import { APP_NAME } from '@/config/app';
import { cn } from '@/lib/utils';
import { useCart } from '@/lib/cart';
import { useTheme } from '@/lib/theme';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';
import { useSlidingIndicator } from '@/lib/use-sliding-indicator';

const NAV = [
  { href: '/', label: 'Acasă' },
  { href: '/search', label: 'Caută' },
  { href: '/messages', label: 'Mesaje' },
  { href: '/profile', label: 'Profil' },
];

// Adaptive header: a compact brand bar on phones (bottom tab bar handles nav),
// a full storefront nav on desktop (brand · links · search · Vinde). Theme
// toggle + dedicated auth control live on the right on every size. The active
// desktop link is marked by a single liquid-glass pill that slides between them.
export function SiteHeader() {
  const pathname = usePathname();
  const { toggle } = useTheme();
  const { user } = useSession();
  const { setOpen } = useAuthModal();
  const { count } = useCart();

  const initial =
    (user?.user_metadata?.full_name as string | undefined)?.charAt(0) ||
    user?.email?.charAt(0) ||
    'C';

  const activeHref =
    NAV.find((l) => (l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)))?.href ?? null;
  const { containerRef, register, pill } = useSlidingIndicator<HTMLElement>(activeHref);

  return (
    <header
      className="sticky top-0 z-50 w-full bg-paper/85 backdrop-blur-md border-b border-line"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto w-full max-w-6xl flex items-center gap-4 lg:gap-6 px-4 sm:px-5 lg:px-8 h-16 lg:h-[72px]">
        {/* min-w-0 + truncate: the brand yields space on narrow phones instead
            of forcing the header (and the whole page) wider than the screen. */}
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* Owner's carousel logo (from the Craftology brand art) */}
          <Image src="/logo-carusel.png" alt="" width={45} height={32} className="h-7 sm:h-8 w-auto shrink-0" priority />
          <span className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-ink truncate">
            {APP_NAME}
          </span>
        </Link>

        {/* Desktop nav links with a sliding liquid-glass active indicator */}
        <nav ref={containerRef} className="hidden lg:flex items-center gap-7 mx-auto relative">
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full bg-clay/10 dark:bg-clay/20 ring-1 ring-clay/20 backdrop-blur-sm shadow-[0_2px_12px_-4px_rgba(185,87,47,0.45)]"
            style={{
              left: pill.left - 14,
              top: pill.top - 6,
              width: pill.width + 28,
              height: pill.height + 12,
              opacity: pill.ready ? 1 : 0,
              transition: pill.animate
                ? 'left .55s cubic-bezier(.22,1,.36,1), width .55s cubic-bezier(.22,1,.36,1), top .55s ease, height .55s ease, opacity .3s ease'
                : 'opacity .3s ease',
            }}
          />
          {NAV.map((link) => {
            const active = link.href === activeHref;
            return (
              <Link
                key={link.href}
                href={link.href}
                ref={register(link.href)}
                className={cn(
                  'relative z-10 text-sm tracking-wide py-1 transition-colors duration-300',
                  active ? 'text-clay' : 'text-ink-soft hover:text-ink',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto lg:ml-0 shrink-0">
          {/* Cart — buyers collect items here, then choose to check out */}
          <Link
            href="/cart"
            aria-label={count > 0 ? `Coșul meu (${count} produse)` : 'Coșul meu'}
            className="relative grid place-items-center w-10 h-10 shrink-0 rounded-full border border-line bg-surface text-ink-soft hover:text-clay hover:border-clay/40 transition-colors"
          >
            <ShoppingBag className="w-[18px] h-[18px]" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-clay text-paper text-[10px] font-bold grid place-items-center ring-2 ring-paper">
                {count}
              </span>
            )}
          </Link>

          {/* Theme toggle — icons are pure CSS off the .dark class (no hydration flash) */}
          <button
            type="button"
            onClick={toggle}
            aria-label="Comută tema"
            title="Comută tema deschisă / întunecată"
            className="grid place-items-center w-10 h-10 shrink-0 rounded-full border border-line bg-surface text-ink-soft hover:text-clay hover:border-clay/40 transition-colors"
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
              className="grid place-items-center w-10 h-10 shrink-0 rounded-full bg-clay text-paper font-display text-sm font-semibold ring-1 ring-clay/40 hover:bg-clay-deep transition-colors"
            >
              {initial.toUpperCase()}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Conectează-te"
              /* Icon-only on narrow phones — the full label needs ~136px and was
                 pushing the header past the viewport. */
              className="inline-flex items-center justify-center gap-1.5 shrink-0 w-10 h-10 sm:w-auto sm:h-auto rounded-full border border-clay/45 text-clay sm:px-3.5 sm:py-2 text-sm font-medium hover:bg-clay hover:text-paper hover:border-clay transition-colors"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Conectează-te</span>
            </button>
          )}

          {/* Vinde — desktop only */}
          <Link
            href="/sell"
            className="hidden lg:inline-flex items-center gap-1.5 rounded-full bg-clay text-paper px-5 py-2.5 text-sm font-medium border-[1.5px] border-edge shadow-[3px_3px_0_0_var(--press)] transition-all ease-pop duration-200 hover:bg-clay-deep hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_var(--press)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--press)] motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0"
          >
            <Plus className="w-4 h-4" />
            Vinde
          </Link>
        </div>
      </div>
    </header>
  );
}
