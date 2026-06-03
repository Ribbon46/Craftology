import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-sage/15 grid place-items-center mb-5 animate-float-in">
        <CheckCircle2 className="w-10 h-10 text-sage" />
      </div>
      <p className="text-[11px] uppercase tracking-[0.25em] text-clay mb-2">Mulțumim</p>
      <h1 className="font-display text-3xl text-ink mb-3 text-balance">Comanda ta a fost plasată!</h1>
      <p className="text-ink-soft mb-8 max-w-xs leading-relaxed">
        Plata a fost procesată cu succes. Vânzătorul te va contacta în privința livrării.
      </p>
      <Link href="/" className="px-6 py-3 rounded-full bg-ink text-paper font-medium hover:bg-clay-deep transition-colors">
        Înapoi la magazin
      </Link>
    </div>
  );
}
