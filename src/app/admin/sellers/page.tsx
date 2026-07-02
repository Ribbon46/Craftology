'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mail, Phone, Link2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { listSellerApplications, reviewSeller, deleteUserAsAdmin } from '@/actions/admin';

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

// Access is gated by the /admin layout (server-side isAdminUser) + the actions
// re-check, so this page only loads + renders its content.
export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Reject flow goes through a themed dialog (a native prompt() would be
  // unstyled chrome and lets an empty reason through).
  const [rejecting, setRejecting] = useState<Seller | null>(null);
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState<Seller | null>(null);

  const load = useCallback(async () => {
    const res = await listSellerApplications();
    if ('sellers' in res) setSellers(res.sellers as Seller[]);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: 'approve' | 'reject' | 'suspend', rejectionReason?: string) => {
    setError(null);
    if (action === 'reject' && !rejectionReason) {
      const seller = sellers.find((s) => s.id === id);
      if (seller) {
        setReason('');
        setRejecting(seller);
      }
      return;
    }
    setBusy(id);
    try {
      const res = await reviewSeller(id, action, rejectionReason);
      if (res && typeof res === 'object' && 'error' in res && res.error) {
        setError(String(res.error));
      }
      await load();
    } catch {
      setError('Acțiunea nu a reușit. Încearcă din nou.');
    } finally {
      setBusy(null);
    }
  };

  const confirmReject = async () => {
    if (!rejecting || !reason.trim()) return;
    const id = rejecting.id;
    const trimmed = reason.trim();
    setRejecting(null);
    await act(id, 'reject', trimmed);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    setBusy(id);
    setError(null);
    try {
      const res = await deleteUserAsAdmin(id);
      if (res && typeof res === 'object' && 'error' in res && res.error) setError(String(res.error));
      await load();
    } catch {
      setError('Ștergerea nu a reușit. Încearcă din nou.');
    } finally {
      setBusy(null);
    }
  };

  const pending = sellers.filter((s) => s.status === 'pending');
  const others = sellers.filter((s) => s.status !== 'pending');

  return (
    <div>
      <h1 className="font-display text-2xl text-ink mb-5">Cereri vânzători</h1>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
          {error}
        </div>
      )}

      {!loaded ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-clay border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sellers.length === 0 ? (
        <p className="text-ink-soft text-center py-10">Nicio cerere încă.</p>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">De verificat ({pending.length})</h2>
              {pending.map((s) => <SellerCard key={s.id} s={s} busy={busy === s.id} onAct={act} onDelete={setDeleting} />)}
            </section>
          )}
          {others.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">Procesate</h2>
              {others.map((s) => <SellerCard key={s.id} s={s} busy={busy === s.id} onAct={act} onDelete={setDeleting} />)}
            </section>
          )}
        </div>
      )}

      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pr-6">
            <DialogTitle className="font-display text-xl">Respinge cererea</DialogTitle>
            <DialogDescription>
              {rejecting?.company_name} — motivul respingerii este afișat vânzătorului.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="ex: CUI-ul nu este valid sau firma nu este activă."
            className="resize-none"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" className="rounded-full" onClick={() => setRejecting(null)}>
              Renunță
            </Button>
            <Button className="rounded-full" disabled={!reason.trim()} onClick={confirmReject}>
              Respinge
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pr-6">
            <DialogTitle className="font-display text-xl">Șterge contul</DialogTitle>
            <DialogDescription>
              {deleting?.company_name} — se șterge definitiv contul, profilul și produsele asociate. Acțiunea nu poate fi anulată.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" className="rounded-full" onClick={() => setDeleting(null)}>
              Renunță
            </Button>
            <Button className="rounded-full bg-destructive text-white hover:bg-destructive/90" onClick={confirmDelete}>
              Șterge definitiv
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SellerCard({ s, busy, onAct, onDelete }: { s: Seller; busy: boolean; onAct: (id: string, a: 'approve' | 'reject' | 'suspend') => void; onDelete: (s: Seller) => void }) {
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
        <div className="text-xs text-ink-soft space-y-1 mb-3">
          {s.contact_email && (
            <p className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
              {s.contact_email}
            </p>
          )}
          {s.contact_phone && (
            <p className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
              {s.contact_phone}
            </p>
          )}
          {s.contact_other && (
            <p className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
              {s.contact_other}
            </p>
          )}
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
          <Button
            size="sm"
            variant="outline"
            className="rounded-full text-destructive border-destructive/30 hover:bg-destructive hover:text-white ml-auto"
            disabled={busy}
            onClick={() => onDelete(s)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Șterge cont
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
