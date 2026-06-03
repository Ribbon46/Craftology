import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 py-6 pb-24">
      <Link href="/" className="inline-flex items-center text-ink-soft hover:text-ink mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Înapoi
      </Link>
      <h1 className="text-2xl font-bold text-ink mb-4">Politica de confidențialitate</h1>
      <div className="space-y-4 text-sm text-ink-soft leading-relaxed">
        <p>
          Confidențialitatea ta este importantă pentru noi. Această politică descrie ce date
          colectăm și cum le folosim, în conformitate cu GDPR.
        </p>
        <h2 className="text-base font-semibold text-ink">Date colectate</h2>
        <p>
          Colectăm adresa de email și informațiile de profil pe care le furnizezi (nume, fotografie,
          anunțuri). Acestea sunt necesare pentru funcționarea contului tău.
        </p>
        <h2 className="text-base font-semibold text-ink">Utilizarea datelor</h2>
        <p>
          Datele sunt folosite exclusiv pentru a oferi serviciile platformei: autentificare, afișarea
          anunțurilor și comunicarea între cumpărători și vânzători.
        </p>
        <h2 className="text-base font-semibold text-ink">Drepturile tale</h2>
        <p>
          Ai dreptul de a accesa, corecta sau șterge datele tale personale în orice moment, din setările
          contului.
        </p>
        <p className="text-xs text-ink-faint pt-4">
          Acesta este un document provizoriu și va fi completat înainte de lansarea publică.
        </p>
      </div>
    </div>
  );
}
