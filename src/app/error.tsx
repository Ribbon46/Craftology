'use client';

import { Button } from '@/components/ui/button';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.25em] text-clay mb-2">Eroare</p>
      <h1 className="font-display text-2xl text-ink mb-2">Ceva n-a mers bine</h1>
      <p className="text-ink-soft mb-6 max-w-sm">A apărut o eroare neașteptată. Încearcă din nou.</p>
      <Button onClick={reset} className="rounded-full">Reîncearcă</Button>
    </div>
  );
}
