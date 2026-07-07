'use client';

import { useState } from 'react';
import { Plane } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { setVacationMode } from '@/actions/seller';

/** Seller dashboard: set/clear a vacation period. While active, buyers see
 *  "vânzătorul este în vacanță, revine în data de X" and purchases are blocked. */
export function VacationCard({ initialUntil }: { initialUntil: string | null }) {
  const [until, setUntil] = useState<string | null>(initialUntil);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = !!until && new Date(until + 'T00:00:00') > new Date();
  const untilRo = until
    ? new Date(until + 'T00:00:00').toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const apply = async (value: string | null) => {
    setError(null);
    setBusy(true);
    try {
      const res = await setVacationMode(value);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setUntil(value);
      setDate('');
    } catch {
      setError('Nu am putut salva. Încearcă din nou.');
    } finally {
      setBusy(false);
    }
  };

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <Card className="border-line mb-5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Plane className="w-4 h-4 text-gold" />
          <h3 className="font-display text-lg text-ink">Mod vacanță</h3>
        </div>
        {active ? (
          <>
            <p className="text-sm text-ink-soft mb-3">
              Magazinul tău este în vacanță până la <strong className="text-ink">{untilRo}</strong>. Cumpărătorii văd
              acest lucru pe produsele tale și nu pot plasa comenzi.
            </p>
            <Button variant="outline" className="rounded-full" disabled={busy} onClick={() => apply(null)}>
              {busy ? 'Se salvează…' : 'Încheie vacanța acum'}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft mb-3">
              Pleci în vacanță sau nu poți livra o perioadă? Alege data revenirii — produsele tale rămân vizibile, dar
              cumpărătorii sunt anunțați și nu pot comanda până atunci.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={date}
                min={tomorrow}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 rounded-lg border-[1.5px] border-input bg-surface px-3 text-sm focus:outline-none focus:border-clay"
              />
              <Button className="rounded-full" disabled={busy || !date} onClick={() => apply(date)}>
                {busy ? 'Se salvează…' : 'Activează modul vacanță'}
              </Button>
            </div>
          </>
        )}
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
