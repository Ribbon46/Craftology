'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Trash2, ArrowLeft, Store, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart';
import { createCartCheckoutSession } from '@/actions/checkout';

const fmt = (n: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(n);

/**
 * Cart: review and edit before paying. Items are grouped by artisan because
 * each marketplace sale is a direct charge on that seller's own Stripe account
 * — so a basket spanning two ateliers is paid in two steps. Checkout is gated
 * behind an explicit terms acceptance (owner requirement).
 */
export default function CartPage() {
  const { items, total, remove, clear, ready } = useCart();
  const [accepted, setAccepted] = useState(false);
  const [busySeller, setBusySeller] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const by = new Map<string, { sellerName: string; items: typeof items }>();
    for (const it of items) {
      if (!by.has(it.sellerId)) by.set(it.sellerId, { sellerName: it.sellerName, items: [] });
      by.get(it.sellerId)!.items.push(it);
    }
    return [...by.entries()].map(([sellerId, g]) => {
      const goods = g.items.reduce((s, i) => s + i.price, 0);
      // One parcel per atelier → charge the highest delivery cost among its items.
      const shipping = g.items.reduce((m, i) => Math.max(m, Number(i.shipping ?? 0)), 0);
      return { sellerId, sellerName: g.sellerName, items: g.items, goods, shipping, total: goods + shipping };
    });
  }, [items]);

  const shippingTotal = groups.reduce((s, g) => s + g.shipping, 0);
  const grandTotal = total + shippingTotal;

  const checkout = async (sellerId: string) => {
    const group = groups.find((g) => g.sellerId === sellerId);
    if (!group) return;
    setError(null);
    setBusySeller(sellerId);
    try {
      const res = await createCartCheckoutSession(group.items.map((i) => i.id));
      if ('url' in res && res.url) {
        window.location.href = res.url;
        return; // navigating to Stripe — keep the loading state
      }
      setError(('error' in res && res.error) || 'Plata nu a putut fi inițiată.');
    } catch {
      setError('Plata nu a putut fi inițiată. Verifică conexiunea și încearcă din nou.');
    }
    setBusySeller(null);
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-clay border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-clay-soft grid place-items-center mb-4 -rotate-3 border-[1.5px] border-clay/35 shadow-[3px_3px_0_0_var(--press-soft)]">
          <ShoppingBag className="w-7 h-7 text-clay" strokeWidth={2.25} />
        </div>
        <h1 className="font-display text-2xl text-ink mb-2">Coșul tău este gol</h1>
        <p className="text-ink-soft mb-6 max-w-xs">Adaugă produsele care îți plac și le găsești aici, gata de comandă.</p>
        <Link href="/" className="px-6 py-3 rounded-full bg-clay text-paper font-medium hover:bg-clay-deep transition-colors">
          Descoperă produse
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 pt-4 mx-auto w-full max-w-3xl px-4 lg:px-8">
      <Link href="/" className="inline-flex items-center text-sm text-ink-soft hover:text-clay mb-4">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Continuă cumpărăturile
      </Link>

      <div className="flex items-baseline justify-between gap-3 mb-5">
        <h1 className="font-display text-2xl lg:text-3xl text-ink">
          Coșul meu <span className="text-ink-faint text-lg">({items.length})</span>
        </h1>
        <button onClick={clear} className="text-xs text-ink-faint hover:text-destructive underline underline-offset-2">
          Golește coșul
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {groups.map((g) => (
          <section
            key={g.sellerId}
            className="rounded-2xl border-[1.5px] border-line-strong bg-surface shadow-[4px_4px_0_0_var(--press-soft)] overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-cream/60">
              <Store className="w-4 h-4 text-clay shrink-0" />
              <p className="text-sm font-medium text-ink truncate">{g.sellerName}</p>
            </div>

            <ul className="divide-y divide-line">
              {g.items.map((it) => (
                <li key={it.id} className="flex gap-3 p-3">
                  <Link href={`/listings/${it.id}`} className="relative w-20 h-20 rounded-xl overflow-hidden bg-cream border border-line shrink-0">
                    {it.image && <Image src={it.image} alt={it.title} fill sizes="80px" className="object-cover" />}
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <Link href={`/listings/${it.id}`} className="font-display text-ink line-clamp-2 hover:text-clay transition-colors">
                      {it.title}
                    </Link>
                    <p className="price font-semibold text-ink mt-1">{fmt(it.price)} lei</p>
                  </div>
                  <button
                    onClick={() => remove(it.id)}
                    aria-label={`Elimină ${it.title} din coș`}
                    className="self-start p-2 rounded-full text-ink-faint hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="px-4 py-3 border-t border-line flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-ink-soft">
                Produse {fmt(g.goods)} lei ·{' '}
                {g.shipping > 0 ? `livrare ${fmt(g.shipping)} lei` : 'livrare gratuită'}
                <br />
                <strong className="price text-ink">Total {fmt(g.total)} lei</strong>
              </p>
              <Button
                className="rounded-full"
                disabled={!accepted || busySeller !== null}
                onClick={() => checkout(g.sellerId)}
              >
                {busySeller === g.sellerId ? 'Se deschide plata…' : `Finalizează comanda · ${fmt(g.total)} lei`}
              </Button>
            </div>
          </section>
        ))}
      </div>

      {groups.length > 1 && (
        <p className="mt-4 text-xs text-ink-soft leading-relaxed">
          Ai produse de la {groups.length} ateliere. Fiecare atelier se plătește separat, pentru ca banii să ajungă
          direct la artizanul care a lucrat piesa.
        </p>
      )}

      {/* Total + terms gate */}
      <div className="mt-6 rounded-2xl border-[1.5px] border-line-strong bg-surface shadow-[4px_4px_0_0_var(--press-soft)] p-4">
        <div className="space-y-1.5 mb-3 text-sm">
          <div className="flex items-center justify-between text-ink-soft">
            <span>Produse</span>
            <span className="price">{fmt(total)} lei</span>
          </div>
          <div className="flex items-center justify-between text-ink-soft">
            <span>Livrare{groups.length > 1 ? ` (${groups.length} ateliere)` : ''}</span>
            <span className="price">{shippingTotal > 0 ? `${fmt(shippingTotal)} lei` : 'gratuită'}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-line">
            <span className="text-ink">Total de plată</span>
            <span className="price text-2xl font-semibold text-ink">{fmt(grandTotal)} lei</span>
          </div>
          <p className="text-xs text-ink-faint pt-0.5">Prețurile sunt finale, cu TVA inclus acolo unde se aplică.</p>
        </div>

        <label className="flex items-start gap-3 text-sm text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-clay shrink-0"
          />
          <span>
            Am citit și accept{' '}
            <Link href="/terms" target="_blank" className="text-clay underline underline-offset-2">
              Termenii și Condițiile
            </Link>
            ,{' '}
            <Link href="/returns" target="_blank" className="text-clay underline underline-offset-2">
              Politica de Retururi
            </Link>{' '}
            și{' '}
            <Link href="/privacy" target="_blank" className="text-clay underline underline-offset-2">
              Politica de Confidențialitate
            </Link>
            .
          </span>
        </label>
        {!accepted && (
          <p className="text-xs text-ink-faint mt-2">
            Bifează căsuța de mai sus pentru a putea finaliza comanda.
          </p>
        )}
        <p className="flex items-center gap-1.5 text-xs text-ink-faint mt-3">
          <ShieldCheck className="w-3.5 h-3.5 text-sage" />
          Plată securizată prin Stripe · Drept de retur în 14 zile
        </p>
      </div>
    </div>
  );
}
