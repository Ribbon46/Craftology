'use client';

import { useRef, useState } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { importCatalog } from '@/actions/import';

interface RowResult { row: number; title: string; ok: boolean; reason?: string }

/** Seller dashboard: bulk-import products from a CSV (Craft'zaar template or a
 *  Shopify product export). Max 20 products per run — big catalogs run it a few
 *  times with split files. */
export function ImportCatalogCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [failures, setFailures] = useState<RowResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = async (file: File) => {
    setError(null);
    setSummary(null);
    setFailures([]);
    if (file.size > 3 * 1024 * 1024) {
      setError('Fișierul este prea mare (max 3MB).');
      return;
    }
    setBusy(true);
    try {
      const res = await importCatalog(await file.text());
      if ('error' in res) {
        setError(res.error);
        return;
      }
      const failed = res.results.filter((r) => !r.ok);
      setSummary(`${res.imported} produse importate${failed.length ? `, ${failed.length} sărite` : ''}.`);
      setFailures(failed);
    } catch {
      setError('Importul a eșuat. Verifică fișierul și încearcă din nou.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card className="border-line mb-5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <FileSpreadsheet className="w-4 h-4 text-sage" />
          <h3 className="font-display text-lg text-ink">Importă produse din CSV</h3>
        </div>
        <p className="text-sm text-ink-soft mb-3">
          Adaugă mai multe produse odată dintr-un fișier CSV — folosește modelul nostru sau direct un export de produse
          din Shopify. Maximum 20 de produse per fișier; pozele se preiau automat de la linkurile din fișier.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/model-import-craftzaar.csv"
            download
            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line-strong px-4 py-2 text-sm text-ink-soft hover:border-clay/45 hover:text-clay transition-colors"
          >
            <Download className="w-4 h-4" /> Descarcă modelul CSV
          </a>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && run(e.target.files[0])}
          />
          <Button className="rounded-full" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? 'Se importă… (poate dura 1-2 minute)' : 'Alege fișierul CSV'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        {summary && <p className="text-sm text-sage font-medium mt-3">{summary}</p>}
        {failures.length > 0 && (
          <ul className="mt-2 text-xs text-ink-soft space-y-1 max-h-40 overflow-y-auto">
            {failures.map((f, i) => (
              <li key={i}>
                rând {f.row} — {f.title || '(fără titlu)'}: {f.reason}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
