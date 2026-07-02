'use client';

import { useEffect, useState } from 'react';
import { PackageOpen } from 'lucide-react';
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
import { getMyOrders, cancelOrderByBuyer, type OrderRow } from '@/actions/orders';

const STATUS: Record<OrderRow['status'], { text: string; cls: string }> = {
  paid: { text: 'Plătită', cls: 'bg-sage/15 text-sage' },
  refunded: { text: 'Rambursată', cls: 'bg-ink/10 text-ink-soft' },
  cancelled: { text: 'Anulată', cls: 'bg-ink/10 text-ink-soft' },
};
const fmt = (bani: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(bani / 100);

/** A logged-in buyer's orders + self-cancel (changed mind). Lives in the
 *  profile "Tranzacții" tab. (Guest buyers cancel from the checkout-success page.) */
export function BuyerOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cancelling, setCancelling] = useState<OrderRow | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => getMyOrders().then((o) => { setOrders(o); setLoaded(true); }).catch(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  const confirmCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    setError(null);
    const res = await cancelOrderByBuyer({ orderId: cancelling.id }, reason.trim() || undefined);
    setBusy(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }
    setCancelling(null);
    setReason('');
    await load();
  };

  if (!loaded) return <p className="text-center text-ink-soft py-8">Se încarcă…</p>;
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-10">
        <PackageOpen className="w-10 h-10 text-ink-faint mb-3" />
        <p className="text-ink-soft">Nicio comandă încă.</p>
      </div>
    );
  }

  return (
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
                <span className="price font-medium text-ink">{fmt(o.amount_total)} lei</span>
                {' · '}
                {new Date(o.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              {o.status === 'paid' && (
                <Button size="sm" variant="outline" className="rounded-full mt-2.5" onClick={() => { setCancelling(o); setError(null); }}>
                  Cere retur / rambursare
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={cancelling !== null} onOpenChange={(o) => !o && setCancelling(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pr-6">
            <DialogTitle className="font-display text-xl">Retur și rambursare</DialogTitle>
            <DialogDescription>
              Ai dreptul de retragere în 14 zile de la primire. Primești rambursarea completă, în 5–10 zile lucrătoare.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Motiv (opțional)" className="resize-none" />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" className="rounded-full" onClick={() => setCancelling(null)}>Renunță</Button>
            <Button className="rounded-full" disabled={busy} onClick={confirmCancel}>
              {busy ? 'Se anulează…' : 'Confirmă'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
