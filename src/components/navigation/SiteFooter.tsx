import Link from 'next/link';
import { APP_NAME } from '@/config/app';

// Desktop-only footer. Phones use the bottom tab bar, so this is hidden there.
export function SiteFooter() {
  return (
    <footer className="hidden lg:block border-t border-line bg-paper mt-20">
      <div className="mx-auto w-full max-w-6xl px-8 py-14 grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-10">
        <div className="max-w-xs">
          <p className="font-display text-2xl text-ink">{APP_NAME}</p>
          <p className="text-[10px] uppercase tracking-[0.28em] text-clay/80 mt-1 mb-3">by Deco Kubik</p>
          <p className="text-sm text-ink-soft leading-relaxed">
            Un atelier digital de produse handmade românești — bijuterii, lumânări, accesorii — de la creatori
            verificați, lucrate cu mâna și cu suflet.
          </p>
        </div>

        <FooterCol title="Explorează" links={[['Acasă', '/'], ['Caută', '/search'], ['Vinde', '/sell']]} />
        <FooterCol title="Cont" links={[['Profil', '/profile'], ['Mesaje', '/messages'], ['Setări', '/profile/settings']]} />
        <FooterCol title="Legal" links={[['Termeni', '/terms'], ['Confidențialitate', '/privacy'], ['Retururi', '/returns']]} />
      </div>
      <div className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-8 py-5 flex items-center justify-between text-xs text-ink-faint">
          <span>© 2026 Deco Kubik SRL</span>
          <span className="font-display italic">Lucrate manual în România</span>
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
