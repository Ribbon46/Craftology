'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { closeMyShop } from '@/actions/seller';

/** "Închide magazinul" — a seller closes their own shop. Blocked server-side
 *  while any order is in progress (the error surfaces here). */
export function CloseShopButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const res = await closeMyShop();
    setBusy(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }
    setOpen(false);
    router.push('/profile');
    router.refresh();
  };

  return (
    <div className="mt-10 pt-6 border-t border-dashed border-line-strong">
      <button
        type="button"
        onClick={() => { setOpen(true); setError(null); }}
        className="text-sm text-destructive hover:underline underline-offset-2"
      >
        Închide magazinul
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pr-6">
            <DialogTitle className="font-display text-xl">Închide magazinul</DialogTitle>
            <DialogDescription>
              Produsele tale vor fi ascunse și nu vei mai putea publica până la o nouă aprobare. Comenzile în curs
              trebuie finalizate sau anulate înainte.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              Renunță
            </Button>
            <Button
              className="rounded-full bg-destructive/90 hover:bg-destructive text-paper border-edge"
              disabled={busy}
              onClick={confirm}
            >
              {busy ? 'Se închide…' : 'Închide definitiv'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
