'use client';

import { useCallback, useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listReports, setReportStatus } from '@/actions/admin';
import { REPORT_REASONS } from '@/config/app';

interface ReportRow {
  id: string;
  target_type: 'listing' | 'seller';
  reason: string;
  details: string | null;
  status: 'open' | 'reviewed' | 'dismissed';
  created_at: string;
  listing_id: string | null;
  seller_id: string;
  listings: { title: string } | null;
  seller: { username: string | null; full_name: string | null } | null;
}

const reasonLabel = (v: string) => REPORT_REASONS.find((r) => r.value === v)?.label ?? v;
const STATUS_LABEL: Record<ReportRow['status'], { text: string; cls: string }> = {
  open: { text: 'Nou', cls: 'bg-gold/15 text-gold' },
  reviewed: { text: 'Verificat', cls: 'bg-sage/15 text-sage' },
  dismissed: { text: 'Respins', cls: 'bg-ink/10 text-ink-soft' },
};

export function ReportsPanel() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await listReports();
    if ('reports' in res) setReports(res.reports as unknown as ReportRow[]);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, status: 'reviewed' | 'dismissed') => {
    setBusy(id);
    try {
      await setReportStatus(id, status);
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (!loaded || reports.length === 0) return null; // hide entirely when there's nothing to triage
  const open = reports.filter((r) => r.status === 'open');

  return (
    <section className="space-y-3 mb-8">
      <h2 className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ink-faint">
        <Flag className="w-3.5 h-3.5 text-clay" />
        Raportări {open.length > 0 && `(${open.length} noi)`}
      </h2>
      {reports.map((r) => {
        const badge = STATUS_LABEL[r.status];
        const sellerName = r.seller?.full_name || r.seller?.username || 'vânzător';
        return (
          <Card key={r.id} className="border-line">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="min-w-0">
                  <p className="font-medium text-ink text-sm">{reasonLabel(r.reason)}</p>
                  <p className="text-xs text-ink-soft truncate">
                    {r.target_type === 'listing' && r.listings?.title
                      ? `Produs: ${r.listings.title}`
                      : `Vânzător: ${sellerName}`}{' '}
                    · {sellerName}
                  </p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.cls}`}>{badge.text}</span>
              </div>
              {r.details && <p className="text-sm text-ink-soft mb-2">{r.details}</p>}
              {r.status === 'open' && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="rounded-full" disabled={busy === r.id} onClick={() => act(r.id, 'reviewed')}>
                    Marchează verificat
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full text-ink-soft" disabled={busy === r.id} onClick={() => act(r.id, 'dismissed')}>
                    Respinge sesizarea
                  </Button>
                </div>
              )}
              <p className="text-[11px] text-ink-faint mt-2">
                Pentru a acționa, suspendă vânzătorul din lista de mai jos.
              </p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
