import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.25em] text-clay mb-2">Eroare 404</p>
      <h1 className="font-display text-3xl text-ink mb-2 text-balance">Pagina nu a fost găsită</h1>
      <p className="text-ink-soft mb-6 max-w-sm">
        Produsul sau pagina pe care o cauți nu există sau a fost mutată.
      </p>
      <Link href="/">
        <Button className="rounded-full">Înapoi acasă</Button>
      </Link>
    </div>
  );
}
