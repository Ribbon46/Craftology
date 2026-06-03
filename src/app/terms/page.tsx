import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen px-4 py-6 pb-24">
      <Link href="/" className="inline-flex items-center text-ink-soft hover:text-ink mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Înapoi
      </Link>
      <h1 className="text-2xl font-bold text-ink mb-4">Termeni și Condiții</h1>
      <div className="space-y-4 text-sm text-ink-soft leading-relaxed">
        <p>
          Bine ai venit pe Craftology by Deco Kubik, o platformă dedicată produselor handmade
          românești. Prin utilizarea aplicației, ești de acord cu termenii de mai jos.
        </p>
        <h2 className="text-base font-semibold text-ink">1. Conturi</h2>
        <p>
          Pentru a vinde produse trebuie să îți creezi un cont. Ești responsabil de păstrarea
          confidențialității datelor de autentificare.
        </p>
        <h2 className="text-base font-semibold text-ink">2. Anunțuri</h2>
        <p>
          Produsele listate trebuie să fie handmade și descrise corect. Ne rezervăm dreptul de a
          elimina anunțurile care încalcă aceste reguli.
        </p>
        <h2 className="text-base font-semibold text-ink">3. Tranzacții</h2>
        <p>
          Tranzacțiile se desfășoară direct între cumpărător și vânzător. Platforma facilitează
          contactul, dar nu este parte în contract.
        </p>
        <p className="text-xs text-ink-faint pt-4">
          Acesta este un document provizoriu și va fi completat înainte de lansarea publică.
        </p>
      </div>
    </div>
  );
}
