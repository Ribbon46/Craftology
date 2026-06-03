'use client';

import { useEffect, useRef, useState } from 'react';
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

  // Desktop nav: a single frosted "liquid glass" pill that slides + stretches
  // between items as the active route changes (measured from the live DOM).
  const navRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [pill, setPill] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const activeIndex = NAV.findIndex((l) =>
    l.href === '/' ? pathname === '/' : pathname.startsWith(l.href),
  );

  useEffect(() => {
    const measure = () => {
      const nav = navRef.current;
      const el = activeIndex >= 0 ? linkRefs.current[activeIndex] : null;
      if (!nav || !el || el.offsetWidth === 0) {
        setPill((p) => (p.ready ? { ...p, ready: false } : p));
        return;
      }
      const navBox = nav.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      setPill({ left: box.left - navBox.left, width: box.width, ready: true });
    };

    measure();
    const raf = requestAnimationFrame(measure); // re-measure after layout settles
    window.addEventListener('resize', measure);
    // Web fonts swap in after first paint and change text width — re-measure then.
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [activeIndex, pathname]);

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

        {/* Desktop nav links with a sliding liquid-glass active indicator */}
        <nav ref={navRef} className="hidden lg:flex items-center gap-7 mx-auto relative">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-9 rounded-full bg-clay/10 dark:bg-clay/20 ring-1 ring-clay/20 backdrop-blur-sm shadow-[0_2px_12px_-4px_rgba(185,87,47,0.45)]"
            style={{
              left: pill.left - 14,
              width: pill.width + 28,
              opacity: pill.ready ? 1 : 0,
              transition:
                'left .55s cubic-bezier(.22,1,.36,1), width .55s cubic-bezier(.22,1,.36,1), opacity .3s ease',
            }}
          />
          {NAV.map((link, i) => {
            const active = i === activeIndex;
            return (
              <Link
                key={link.href}
                href={link.href}
                ref={(el) => {
                  linkRefs.current[i] = el;
                }}
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
