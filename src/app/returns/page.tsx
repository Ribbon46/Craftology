import Link from 'next/link';
import { ArrowLeft, TriangleAlert } from 'lucide-react';

export const metadata = { title: 'Politica de Retur · Craftology' };

export default function ReturnsPage() {
  return (
    <div className="min-h-screen px-5 py-6 pb-24 max-w-2xl mx-auto">
      <Link href="/" className="inline-flex items-center text-ink-soft hover:text-clay mb-5 text-sm">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Înapoi
      </Link>
      <h1 className="font-display text-3xl text-ink mb-1">Politica de Retur și Dreptul de Retragere</h1>
      <p className="text-xs text-ink-faint mb-6">Conformă cu OUG 34/2014. Ultima actualizare: [DATĂ]</p>

      <div className="space-y-5 text-sm text-ink-soft leading-relaxed [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-ink [&_h2]:mt-6 [&_h2]:mb-1">
        <h2>1. Dreptul de retragere (14 zile)</h2>
        <p>
          În calitate de consumator, ai dreptul de a te retrage din contract în termen de <strong>14 zile</strong>
          {' '}de la primirea produsului, fără a invoca un motiv. Pentru a-ți exercita dreptul, ne anunți printr-o
          declarație clară la [EMAIL] înainte de expirarea termenului.
        </p>

        <h2>2. Excepții importante (produse handmade)</h2>
        <p>
          Conform legii, dreptul de retragere <strong>nu se aplică</strong> produselor <strong>personalizate sau
          realizate la comandă</strong> conform specificațiilor cumpărătorului (frecvent în cazul produselor
          handmade). Vânzătorul va indica în anunț dacă un produs este realizat la comandă.
        </p>

        <h2>3. Cum returnezi</h2>
        <p>
          După notificarea retragerii, returnezi produsul în maximum 14 zile, în starea în care l-ai primit.
          Costurile returului sunt suportate de cumpărător, cu excepția cazului în care produsul este defect sau
          neconform.
        </p>

        <h2>4. Rambursarea</h2>
        <p>
          Rambursăm sumele primite (inclusiv costurile standard de livrare) în maximum 14 zile de la primirea
          produsului returnat, folosind aceeași metodă de plată (prin Stripe).
        </p>

        <h2>5. Garanția legală de conformitate</h2>
        <p>
          Produsele beneficiază de garanția legală de conformitate. Dacă un produs este defect sau diferă de
          descriere, ai dreptul la reparare, înlocuire sau rambursare conform legii.
        </p>

        <h2>6. Contact și reclamații</h2>
        <p>
          Pentru retururi și reclamații: [EMAIL]. Te poți adresa și ANPC (anpc.ro) sau platformei SOL a UE
          (ec.europa.eu/consumers/odr).
        </p>

        <p className="flex items-start gap-1.5 text-xs text-ink-faint pt-6 border-t border-line mt-6">
          <TriangleAlert className="w-3.5 h-3.5 text-clay flex-shrink-0 mt-px" />
          <span>
            Document-șablon. Completează câmpurile [ ] și fă-l revizuit de un avocat înainte de lansare. Vezi și{' '}
            <Link href="/terms" className="text-clay underline underline-offset-2">Termeni</Link> și{' '}
            <Link href="/privacy" className="text-clay underline underline-offset-2">Confidențialitate</Link>.
          </span>
        </p>
      </div>
    </div>
  );
}
