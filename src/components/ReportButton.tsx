'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';
import { submitReport } from '@/actions/reports';
import { REPORT_REASONS } from '@/config/app';

/** Subtle "Raportează" control on a listing — opens a themed dialog with reason
 *  radios + optional details. Guests are sent to the auth modal first. */
export function ReportButton({ listingId }: { listingId: string }) {
  const { user } = useSession();
  const { setOpen: setAuthOpen } = useAuthModal();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const reset = () => {
    setDone(false);
    setReason('');
    setDetails('');
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!reason) {
      setError('Alege un motiv.');
      return;
    }
    setPending(true);
    const res = await submitReport({
      targetType: 'listing',
      listingId,
      reason: reason as (typeof REPORT_REASONS)[number]['value'],
      details: details.trim() || undefined,
    });
    setPending(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }
    setDone(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => (user ? setOpen(true) : setAuthOpen(true))}
        className="inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-clay transition-colors"
      >
        <Flag className="w-3.5 h-3.5" />
        Raportează
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pr-6">
            <DialogTitle className="font-display text-xl">Raportează produsul</DialogTitle>
            <DialogDescription>Spune-ne ce nu e în regulă. Verificăm fiecare sesizare.</DialogDescription>
          </DialogHeader>

          {done ? (
            <p className="text-sm text-sage">Mulțumim. Am primit sesizarea ta și o vom verifica.</p>
          ) : (
            <>
              <div className="space-y-2">
                {REPORT_REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-clay w-4 h-4"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Detalii (opțional)"
                className="resize-none"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
                  Renunță
                </Button>
                <Button className="rounded-full" disabled={pending} onClick={submit}>
                  {pending ? 'Se trimite…' : 'Trimite'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
