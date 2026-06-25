'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getSellerOrders, cancelOrderAsSeller, type OrderRow } from '@/actions/orders';

const STATUS: Record<OrderRow['status'], { text: string; cls: string }> = {
  paid: { text: 'Plătită', cls: 'bg-sage/15 text-sage' },
  refunded: { text: 'Rambursată', cls: 'bg-ink/10 text-ink-soft' },
  cancelled: { text: 'Anulată', cls: 'bg-ink/10 text-ink-soft' },
};

const fmt = (bani: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(bani / 100);

export function SellerOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cancelling, setCancelling] = useState<OrderRow | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => getSellerOrders().then((o) => { setOrders(o); setLoaded(true); }).catch(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  const confirmCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    setError(null);
    const res = await cancelOrderAsSeller(cancelling.id, reason.trim() || undefined);
    setBusy(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }
    setCancelling(null);
    setReason('');
    await load();
  };

  if (!loaded || orders.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="font-display text-lg text-ink mb-3">Comenzi</h2>
      <div className="space-y-3">
        {orders.map((o) => {
          const badge = STATUS[o.status];
          return (
            <Card key={o.id} className="border-line">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-medium text-ink text-sm truncate">{o.listings?.title ?? 'Produs'}</p>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.cls}`}>{badge.text}</span>
                </div>
                <p className="text-xs text-ink-soft">
                  {o.buyer_email ?? 'cumpărător'} · <span className="price font-medium text-ink">{fmt(o.amount_total)} lei</span>
                  {' · '}
                  {new Date(o.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                </p>
                {o.status === 'paid' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full mt-2.5 text-clay-deep border-clay/30"
                    onClick={() => { setCancelling(o); setError(null); }}
                  >
                    Anulează (indisponibil)
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={cancelling !== null} onOpenChange={(o) => !o && setCancelling(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pr-6">
            <DialogTitle className="font-display text-xl">Anulează comanda</DialogTitle>
            <DialogDescription>
              Clientul primește rambursarea completă, iar produsul revine la vânzare. Acțiunea nu poate fi anulată.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Motiv (opțional, ex: stoc epuizat)" className="resize-none" />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" className="rounded-full" onClick={() => setCancelling(null)}>Renunță</Button>
            <Button className="rounded-full" disabled={busy} onClick={confirmCancel}>
              {busy ? 'Se anulează…' : 'Confirmă anularea'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
