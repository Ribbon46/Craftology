'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isAdminUser, listSellerApplications, reviewSeller } from '@/actions/admin';

interface Seller {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  company_name: string;
  cui: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_other: string | null;
  workshop_description: string | null;
  rejection_reason: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<Seller['status'], { text: string; cls: string }> = {
  pending: { text: 'În așteptare', cls: 'bg-gold/15 text-gold' },
  approved: { text: 'Aprobat', cls: 'bg-sage/15 text-sage' },
  rejected: { text: 'Respins', cls: 'bg-clay/15 text-clay-deep' },
  suspended: { text: 'Suspendat', cls: 'bg-ink/10 text-ink-soft' },
};

export default function AdminSellersPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await listSellerApplications();
    if ('sellers' in res) setSellers(res.sellers as Seller[]);
  }, []);

  useEffect(() => {
    isAdminUser().then(async (ok) => {
      setAllowed(ok);
      if (ok) await load();
    });
  }, [load]);

  const act = async (id: string, action: 'approve' | 'reject' | 'suspend') => {
    let reason: string | undefined;
    if (action === 'reject') {
      reason = window.prompt('Motivul respingerii (afișat vânzătorului):') ?? undefined;
      if (reason === undefined) return; // cancelled
    }
    setBusy(id);
    await reviewSeller(id, action, reason);
    await load();
    setBusy(null);
  };

  if (allowed === null) {
    return <div className="flex items-center justify-center h-[60vh] text-ink-soft">Se încarcă…</div>;
  }
  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center">
        <h1 className="font-display text-2xl text-ink mb-2">Acces interzis</h1>
        <p className="text-ink-soft mb-6">Această pagină e disponibilă doar administratorilor.</p>
        <Link href="/"><Button className="rounded-full">Înapoi la feed</Button></Link>
      </div>
    );
  }

  const pending = sellers.filter((s) => s.status === 'pending');
  const others = sellers.filter((s) => s.status !== 'pending');

  return (
    <div className="min-h-screen px-4 py-6 pb-24 mx-auto w-full max-w-3xl">
      <Link href="/profile" className="inline-flex items-center text-ink-soft hover:text-ink mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Înapoi
      </Link>
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-6 h-6 text-clay" />
        <h1 className="font-display text-2xl text-ink">Cereri vânzători</h1>
      </div>

      {sellers.length === 0 ? (
        <p className="text-ink-soft text-center py-10">Nicio cerere încă.</p>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">De verificat ({pending.length})</h2>
              {pending.map((s) => <SellerCard key={s.id} s={s} busy={busy === s.id} onAct={act} />)}
            </section>
          )}
          {others.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Procesate</h2>
              {others.map((s) => <SellerCard key={s.id} s={s} busy={busy === s.id} onAct={act} />)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SellerCard({ s, busy, onAct }: { s: Seller; busy: boolean; onAct: (id: string, a: 'approve' | 'reject' | 'suspend') => void }) {
  const badge = STATUS_LABEL[s.status];
  return (
    <Card className="border-line">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg text-ink truncate">{s.company_name}</h3>
            <p className="text-xs text-ink-faint">CUI: {s.cui ?? '—'}</p>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.cls}`}>{badge.text}</span>
        </div>
        {s.workshop_description && <p className="text-sm text-ink-soft mb-2">{s.workshop_description}</p>}
        <div className="text-xs text-ink-soft space-y-0.5 mb-3">
          {s.contact_email && <p>✉ {s.contact_email}</p>}
          {s.contact_phone && <p>☎ {s.contact_phone}</p>}
          {s.contact_other && <p>🔗 {s.contact_other}</p>}
          {s.rejection_reason && <p className="text-clay-deep">Motiv respingere: {s.rejection_reason}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {s.status !== 'approved' && (
            <Button size="sm" className="rounded-full" disabled={busy} onClick={() => onAct(s.id, 'approve')}>Aprobă</Button>
          )}
          {s.status === 'pending' && (
            <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => onAct(s.id, 'reject')}>Respinge</Button>
          )}
          {s.status === 'approved' && (
            <Button size="sm" variant="outline" className="rounded-full text-clay-deep border-clay/30" disabled={busy} onClick={() => onAct(s.id, 'suspend')}>Suspendă</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
