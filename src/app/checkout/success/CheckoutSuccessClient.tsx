'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Undo2 } from 'lucide-react';
import { cancelOrderByBuyer } from '@/actions/orders';

/**
 * Success screen + the GUEST cancellation entry point. A buyer who paid without
 * an account is authorized to cancel by possessing the (unguessable) Stripe
 * session id in the URL — the capability-URL model. Full refund, item re-listed.
 */
export function CheckoutSuccessClient({
  sessionId,
  status,
}: {
  sessionId?: string;
  status?: string;
}) {
  const [cancelled, setCancelled] = useState(status === 'refunded');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const cancel = async () => {
    if (!sessionId) return;
    setError(null);
    setPending(true);
    const res = await cancelOrderByBuyer({ sessionId }, reason.trim() || undefined);
    setPending(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }
    setCancelled(true);
    setOpen(false);
  };

  if (cancelled) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-clay-soft grid place-items-center mb-5 animate-float-in -rotate-3 border-[1.5px] border-clay/35 shadow-[3px_3px_0_0_var(--press-soft)]">
          <Undo2 className="w-9 h-9 text-clay" strokeWidth={2.25} />
        </div>
        <h1 className="font-display text-3xl text-ink mb-3 text-balance">Comanda a fost anulată</h1>
        <p className="text-ink-soft mb-8 max-w-xs leading-relaxed">
          Ți-am inițiat rambursarea completă. Banii revin în contul tău în 5-10 zile lucrătoare.
        </p>
        <Link href="/" className="px-6 py-3 rounded-full bg-ink text-paper font-medium hover:bg-clay-deep transition-colors">
          Înapoi la magazin
        </Link>
      </div>
    );
  }

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

      {/* Self-service withdrawal (OUG 34/2014), while the order is still 'paid'.
          Deliberately a clear, labeled button — not a subtle link or icon. */}
      {sessionId && status === 'paid' && (
        <div className="mt-8 max-w-xs w-full">
          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="w-full rounded-full border-[1.5px] border-clay/45 text-clay px-5 py-2.5 text-sm font-medium hover:bg-clay hover:text-paper transition-colors"
            >
              Retur / Renunțare la achiziție
            </button>
          ) : (
            <div className="rounded-2xl border-[1.5px] border-line-strong bg-surface shadow-[4px_4px_0_0_var(--press-soft)] p-4 text-left">
              <p className="text-sm font-medium text-ink mb-1">Formular de retragere din contract</p>
              <p className="text-xs text-ink-soft mb-2 leading-relaxed">
                Prin trimiterea acestui formular te retragi din contractul de vânzare (OUG 34/2014) și primești
                rambursarea completă în 5–10 zile lucrătoare.
              </p>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motiv (opțional — nu este obligatoriu)"
                className="w-full rounded-lg border-[1.5px] border-input bg-paper px-3 py-2 text-sm mb-2 focus:outline-none focus:border-clay focus:shadow-[3px_3px_0_0_var(--focus-press)]"
              />
              {error && <p className="text-xs text-destructive mb-2">{error}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setOpen(false)} className="rounded-full border-[1.5px] border-line text-ink-soft px-4 py-1.5 text-sm">
                  Înapoi
                </button>
                <button
                  onClick={cancel}
                  disabled={pending}
                  className="rounded-full bg-clay text-paper px-4 py-1.5 text-sm font-medium border-[1.5px] border-edge disabled:opacity-60"
                >
                  {pending ? 'Se trimite…' : 'Trimite cererea de retragere'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
