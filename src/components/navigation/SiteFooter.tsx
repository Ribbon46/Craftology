import Link from 'next/link';
import { APP_NAME } from '@/config/app';
import { AnpcBadges } from '@/components/AnpcBadges';

// Footer. The full link grid is desktop-only (phones use the bottom tab bar),
// but the legal strip — mandatory ANPC/SOL badges + © — shows on ALL sizes so
// mobile users see the consumer-protection notices too.
export function SiteFooter() {
  return (
    <footer className="border-t-2 border-dashed border-line-strong bg-paper mt-10 lg:mt-20">
      <div className="hidden lg:grid mx-auto w-full max-w-6xl px-8 py-14 grid-cols-[1.5fr_1fr_1fr_1fr] gap-10">
        <div className="max-w-xs">
          <p className="font-display text-2xl text-ink">{APP_NAME}</p>
          <p className="text-[10px] uppercase tracking-[0.28em] text-clay/80 mt-1 mb-3">powered by Deco Kubik</p>
          <p className="text-sm text-ink-soft leading-relaxed">
            Un atelier digital de produse handmade românești — bijuterii, lumânări, accesorii — de la creatori
            verificați.
          </p>
        </div>

        <FooterCol title="Explorează" links={[['Acasă', '/'], ['Caută', '/search'], ['Vinde', '/sell']]} />
        <FooterCol title="Cont" links={[['Profil', '/profile'], ['Mesaje', '/messages'], ['Setări', '/profile/settings']]} />
        <FooterCol title="Legal" links={[['Termeni', '/terms'], ['Confidențialitate', '/privacy'], ['Cookie-uri', '/cookies'], ['Acord vânzător', '/seller-agreement'], ['Retururi', '/returns']]} />
      </div>
      {/* Legal strip — visible on ALL screen sizes (mandatory badges). Mobile
          gets extra bottom padding to clear the fixed bottom tab bar. */}
      <div className="lg:border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 lg:px-8 pt-5 pb-28 lg:pb-5">
          <AnpcBadges className="justify-center lg:justify-start mb-4" />

          {/* Payment methods */}
          <div className="flex items-center justify-center lg:justify-start gap-2 mb-4" aria-label="Metode de plată">
            {['Visa', 'Mastercard', 'Stripe'].map((m) => (
              <span key={m} className="px-3 py-1 rounded-md border border-line bg-paper text-[11px] font-bold tracking-wide text-ink-soft">
                {m}
              </span>
            ))}
            <span className="text-[11px] text-ink-faint">Plăți securizate prin Stripe</span>
          </div>

          {/* Legal links — visible on MOBILE too (the grid above is desktop-only) */}
          <nav className="lg:hidden flex flex-wrap justify-center gap-x-4 gap-y-1.5 mb-4 text-xs">
            {[
              ['Termeni', '/terms'],
              ['Confidențialitate', '/privacy'],
              ['Cookie-uri', '/cookies'],
              ['Retururi', '/returns'],
              ['Acord vânzător', '/seller-agreement'],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="text-ink-soft underline underline-offset-2 hover:text-clay">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-1.5 text-xs text-ink-faint text-center">
            <span>
              © {new Date().getFullYear()} Craft&apos;zaar este o marcă comercială a Deco Kubik SRL · CUI RO24386414 ·{' '}
              <a href="mailto:info.craftology.shop@gmail.com" className="underline underline-offset-2 hover:text-clay">
                info.craftology.shop@gmail.com
              </a>
            </span>
            <span className="font-display italic">Lucrate manual în România</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-[0.2em] text-ink-faint mb-3">{title}</h3>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="text-sm text-ink-soft hover:text-clay transition-colors">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
