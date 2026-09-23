'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronDown, Clock, Mail, Phone, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cancelOrderAsSeller, type SellerOrderRow } from '@/actions/orders';
import {
  COMPANY,
  SELLER_CANCEL_REASONS,
  SELLER_CANCEL_WINDOW_HOURS,
  type SellerCancelReasonCode,
} from '@/config/app';
import { cn } from '@/lib/utils';

const STATUS: Record<SellerOrderRow['status'], { text: string; cls: string }> = {
  paid: { text: 'Plătită', cls: 'bg-sage/15 text-sage' },
  refunded: { text: 'Anulată · rambursată', cls: 'bg-ink/10 text-ink-soft' },
  cancelled: { text: 'Anulată', cls: 'bg-ink/10 text-ink-soft' },
};

const CANCELLED_BY: Record<NonNullable<SellerOrderRow['cancelled_by']>, string> = {
  seller: 'de tine',
  buyer: 'de client (retragere din contract)',
  admin: "de echipa Craft'zaar",
};

/** bani → "120" / "120,50" lei */
const lei = (bani: number) =>
  new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: bani % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(bani / 100) + ' lei';

const WINDOW_MS = SELLER_CANCEL_WINDOW_HOURS * 3_600_000;

/** Milliseconds left in the seller's cancel window (≤ 0 once it has closed). */
export function cancelWindowLeft(order: { created_at: string }, now = Date.now()) {
  return new Date(order.created_at).getTime() + WINDOW_MS - now;
}

/** Paid orders still inside the cancel window — the ones awaiting a decision. */
export function countNewOrders(orders: SellerOrderRow[], now = Date.now()) {
  return orders.filter((o) => o.status === 'paid' && cancelWindowLeft(o, now) > 0).length;
}

const leftLabel = (ms: number) => {
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `${h} h ${Math.floor((ms % 3_600_000) / 60_000)} min` : `${Math.max(1, Math.ceil(ms / 60_000))} min`;
};

type Filter = 'toate' | 'active' | 'anulate';

/**
 * The seller's "Comenzi" tab: every order with the buyer's contact, delivery
 * and invoicing details and the payment breakdown. Within the first
 * SELLER_CANCEL_WINDOW_HOURS the seller can refuse an order with a reason —
 * the buyer is refunded automatically and emailed the reason.
 */
export function SellerOrders({
  orders,
  loaded,
  onChanged,
}: {
  orders: SellerOrderRow[];
  loaded: boolean;
  onChanged: () => Promise<unknown> | void;
}) {
  const [filter, setFilter] = useState<Filter>('toate');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [cancelling, setCancelling] = useState<SellerOrderRow | null>(null);
  const [code, setCode] = useState<SellerCancelReasonCode | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tick every minute so the "you can still cancel for…" countdown stays true.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const startCancel = (o: SellerOrderRow) => {
    setCancelling(o);
    setCode(null);
    setDetails('');
    setError(null);
  };

  const confirmCancel = async () => {
    if (!cancelling || !code) return;
    setBusy(true);
    setError(null);
    const res = await cancelOrderAsSeller(cancelling.id, { code, details: details.trim() || undefined });
    setBusy(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }
    setCancelling(null);
    await onChanged();
  };

  if (!loaded) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-clay border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-12 text-ink-soft">
        <PackageOpen className="w-10 h-10 text-ink-faint mb-3" />
        <p>Nicio comandă încă.</p>
        <p className="text-xs text-ink-faint mt-1">Comenzile apar aici imediat ce un client plătește.</p>
      </div>
    );
  }

  const active = orders.filter((o) => o.status === 'paid');
  const cancelled = orders.filter((o) => o.status !== 'paid');
  const shown = filter === 'active' ? active : filter === 'anulate' ? cancelled : orders;
  const needsText = code === 'other';

  return (
    <section>
      <p className="text-sm text-ink-soft mb-4 leading-relaxed">
        Dacă nu poți onora o comandă, o poți anula în primele {SELLER_CANCEL_WINDOW_HOURS} de ore de la plasare.
        Clientul primește automat banii înapoi și un email cu motivul ales.
      </p>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'toate', label: 'Toate', n: orders.length },
            { id: 'active', label: 'Active', n: active.length },
            { id: 'anulate', label: 'Anulate', n: cancelled.length },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn('chip', filter === f.id ? 'chip-active' : 'chip-inactive')}
          >
            {f.label}
            <span className="ml-1.5 opacity-60">{f.n}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-center text-ink-soft py-10">Nicio comandă în această listă.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((o) => {
            const badge = STATUS[o.status];
            const left = cancelWindowLeft(o, now);
            const canCancel = o.status === 'paid' && left > 0;
            const expanded = open.has(o.id);
            const thumb = o.listings?.image_urls?.[0];
            const fee = Number(o.application_fee_amount ?? 0);
            return (
              <div
                key={o.id}
                className="rounded-2xl border-[1.5px] border-line-strong bg-surface shadow-[3px_3px_0_0_var(--press-soft)] overflow-hidden"
              >
                <div className="flex gap-3 p-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-cream shrink-0">
                    {thumb && <Image src={thumb} alt="" fill sizes="56px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-ink text-sm line-clamp-2">{o.listings?.title ?? 'Produs'}</p>
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                        {badge.text}
                      </span>
                    </div>
                    <p className="text-xs text-ink-faint mt-0.5">
                      #{o.id.slice(0, 8).toUpperCase()} ·{' '}
                      {new Date(o.created_at).toLocaleString('ro-RO', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-ink-soft mt-1">
                      {o.buyer_name || o.buyer_email || 'Client'} ·{' '}
                      <span className="price font-medium text-ink">{lei(o.amount_total)}</span>
                    </p>
                    {canCancel && (
                      <p className="inline-flex items-center gap-1 mt-2 rounded-full bg-gold/12 border border-gold/35 px-2.5 py-0.5 text-[11px] text-ink">
                        <Clock className="w-3 h-3" /> Poți anula încă {leftLabel(left)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3">
                  <button
                    onClick={() => toggle(o.id)}
                    aria-expanded={expanded}
                    className="inline-flex items-center gap-1 text-sm font-medium text-clay hover:text-clay-deep"
                  >
                    {expanded ? 'Ascunde detaliile' : 'Detalii comandă'}
                    <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
                  </button>
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full text-clay-deep border-clay/35 hover:bg-clay hover:text-paper"
                      onClick={() => startCancel(o)}
                    >
                      Anulează comanda
                    </Button>
                  )}
                </div>

                {expanded && (
                  <div className="border-t border-line bg-cream/40 px-4 py-4 space-y-4 text-sm">
                    <Detail label="Client">
                      <p className="text-ink">{o.buyer_name || '—'}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {o.buyer_phone && (
                          <a href={`tel:${o.buyer_phone}`} className="inline-flex items-center gap-1 text-clay hover:underline">
                            <Phone className="w-3.5 h-3.5" /> {o.buyer_phone}
                          </a>
                        )}
                        {o.buyer_email && (
                          <a href={`mailto:${o.buyer_email}`} className="inline-flex items-center gap-1 text-clay hover:underline break-all">
                            <Mail className="w-3.5 h-3.5 shrink-0" /> {o.buyer_email}
                          </a>
                        )}
                      </div>
                    </Detail>

                    <Detail label="Adresa de livrare">
                      <p className="text-ink whitespace-pre-line">{o.shipping_address || '—'}</p>
                    </Detail>

                    <Detail label="Facturare">
                      {o.buyer_type === 'company' ? (
                        <p className="text-ink">
                          {o.company_name} · CUI {o.company_cui}
                          <br />
                          <span className="text-ink-soft">{o.company_address}</span>
                        </p>
                      ) : (
                        <p className="text-ink">Persoană fizică</p>
                      )}
                    </Detail>

                    <Detail label="Plată">
                      <p className="text-ink-soft mb-1.5">Card, online prin Stripe</p>
                      <dl className="space-y-1">
                        <Money label="Total plătit de client" value={lei(o.amount_total)} strong />
                        {fee > 0 && o.status === 'paid' && (
                          <>
                            <Money label="Comision Craft'zaar" value={`−${lei(fee)}`} />
                            <Money
                              label="Rămâne la tine"
                              hint="înainte de taxa de procesare Stripe"
                              value={lei(o.amount_total - fee)}
                            />
                          </>
                        )}
                        {o.status !== 'paid' && (
                          <Money
                            label={
                              o.refunded_at
                                ? `Rambursat clientului pe ${new Date(o.refunded_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}`
                                : 'Rambursat clientului'
                            }
                            value={lei(Number(o.amount_refunded || o.amount_total))}
                          />
                        )}
                      </dl>
                    </Detail>

                    {o.status !== 'paid' && (
                      <Detail label="Anulare">
                        <p className="text-ink">
                          Anulată {o.cancelled_by ? CANCELLED_BY[o.cancelled_by] : ''}
                          {o.cancel_reason && <span className="text-ink-soft"> · {o.cancel_reason}</span>}
                        </p>
                      </Detail>
                    )}

                    {o.status === 'paid' && !canCancel && (
                      <p className="text-xs text-ink-faint leading-relaxed">
                        Termenul de {SELLER_CANCEL_WINDOW_HOURS} de ore pentru anulare a trecut. Dacă totuși nu poți
                        onora comanda, scrie-ne la{' '}
                        <a href={`mailto:${COMPANY.email}`} className="text-clay hover:underline">{COMPANY.email}</a>.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={cancelling !== null} onOpenChange={(v) => !v && !busy && setCancelling(null)}>
        <DialogContent className="sm:max-w-md p-6 max-h-[90dvh] overflow-y-auto">
          <DialogHeader className="pr-6">
            <DialogTitle className="font-display text-xl">Anulează comanda</DialogTitle>
            <DialogDescription>
              {cancelling && (
                <>
                  „{cancelling.listings?.title ?? 'Produs'}” · {lei(cancelling.amount_total)}.{' '}
                </>
              )}
              Clientul primește automat banii înapoi pe card și un email cu motivul ales. Produsul revine în stoc.
              Acțiunea nu poate fi anulată.
            </DialogDescription>
          </DialogHeader>

          <fieldset>
            <legend className="text-sm font-medium text-ink mb-2">Motivul anulării</legend>
            <div className="space-y-1.5" role="radiogroup">
              {SELLER_CANCEL_REASONS.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  role="radio"
                  aria-checked={code === r.code}
                  onClick={() => { setCode(r.code); setError(null); }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 text-left text-sm transition-colors',
                    code === r.code
                      ? 'border-clay bg-clay/8 text-ink'
                      : 'border-line text-ink-soft hover:border-line-strong hover:text-ink',
                  )}
                >
                  <span
                    className={cn(
                      'grid place-items-center w-4 h-4 rounded-full border-[1.5px] shrink-0',
                      code === r.code ? 'border-clay' : 'border-line-strong',
                    )}
                  >
                    {code === r.code && <span className="w-2 h-2 rounded-full bg-clay" />}
                  </span>
                  {r.label}
                </button>
              ))}
            </div>
          </fieldset>

          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={needsText ? 'Scrie motivul — îl va primi clientul' : 'Detalii pentru client (opțional)'}
            className="resize-none"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" className="rounded-full" disabled={busy} onClick={() => setCancelling(null)}>
              Renunță
            </Button>
            <Button
              className="rounded-full"
              disabled={busy || !code || (needsText && !details.trim())}
              onClick={confirmCancel}
            >
              {busy ? 'Se anulează…' : 'Anulează și rambursează'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-1">{label}</p>
      {children}
    </div>
  );
}

function Money({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-soft">
        {label}
        {hint && <span className="block text-[11px] text-ink-faint">{hint}</span>}
      </dt>
      <dd className={cn('price whitespace-nowrap', strong ? 'font-semibold text-ink' : 'text-ink')}>{value}</dd>
    </div>
  );
}
