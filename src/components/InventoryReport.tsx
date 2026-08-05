'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Printer, Save, Check, RotateCcw, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateInventory } from '@/actions/listings';
import { CATEGORIES } from '@/config/app';
import type { Listing } from '@/lib/mock';

const fmt = (n: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(n);
const today = () => new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * The seller's stock report: every product with how many pieces are on the
 * shelf. Quantities are editable in place and saved in one go, and the whole
 * thing prints on its own (the `no-print` chrome drops away, see globals.css).
 */
export function InventoryReport({ listings, shopName }: { listings: Listing[]; shopName: string }) {
  // id -> edited quantity, as a string so the field can be cleared while typing.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      [...listings].sort(
        (a, b) => a.category.localeCompare(b.category, 'ro') || a.title.localeCompare(b.title, 'ro'),
      ),
    [listings],
  );

  const stockOf = (l: Listing) => Number(l.stock ?? (l.status === 'sold' ? 0 : 1));
  const valueOf = (l: Listing) => {
    const raw = edits[l.id];
    const qty = raw === undefined || raw === '' ? stockOf(l) : Math.max(0, Math.trunc(Number(raw) || 0));
    return qty;
  };

  const changed = rows.filter((l) => edits[l.id] !== undefined && valueOf(l) !== stockOf(l));
  const totalPieces = rows.reduce((s, l) => s + valueOf(l), 0);
  const totalValue = rows.reduce((s, l) => s + valueOf(l) * Number(l.price), 0);
  const outOfStock = rows.filter((l) => valueOf(l) === 0).length;

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await updateInventory(changed.map((l) => ({ id: l.id, stock: valueOf(l) })));
      if ('error' in res && res.error) {
        setError(res.error);
        return;
      }
      setSaved(true);
      // The parent list is server data; a reload is the honest way to show the
      // saved state rather than faking it locally.
      setTimeout(() => window.location.reload(), 900);
    } catch {
      setError('Salvarea nu a reușit. Verifică conexiunea și încearcă din nou.');
    } finally {
      setSaving(false);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-16 text-ink-soft">
        <PackageOpen className="w-10 h-10 text-ink-faint mb-3" />
        <p>Nu ai încă produse în inventar.</p>
        <Link href="/sell" className="mt-4">
          <Button className="rounded-full">Adaugă primul produs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="print-area">
      {/* Report header — also the printed letterhead */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="font-display text-xl text-ink">Raport de inventar</h2>
          <p className="text-sm text-ink-soft">
            {shopName} · {today()}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" />
            Tipărește
          </Button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <Tile label="Produse" value={fmt(rows.length)} />
        <Tile label="Bucăți în stoc" value={fmt(totalPieces)} />
        <Tile label="Fără stoc" value={fmt(outOfStock)} />
        <Tile label="Valoare stoc" value={`${fmt(totalValue)} lei`} />
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm no-print">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border-[1.5px] border-line-strong bg-surface">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-ink-soft border-b border-line">
              <th className="px-3 py-2.5 font-medium">Produs</th>
              <th className="px-3 py-2.5 font-medium hidden sm:table-cell">Categorie</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Preț</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Bucăți</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap hidden sm:table-cell">Valoare</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const qty = valueOf(l);
              const isChanged = edits[l.id] !== undefined && qty !== stockOf(l);
              return (
                <tr key={l.id} className="border-b border-line/60 last:border-0 align-middle">
                  <td className="px-3 py-2">
                    <Link href={`/listings/${l.id}`} className="text-ink hover:text-clay line-clamp-2">
                      {l.title}
                    </Link>
                    <span className="sm:hidden block text-xs text-ink-faint">
                      {CATEGORIES[l.category as keyof typeof CATEGORIES] ?? l.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink-soft hidden sm:table-cell">
                    {CATEGORIES[l.category as keyof typeof CATEGORIES] ?? l.category}
                  </td>
                  <td className="px-3 py-2 text-right price whitespace-nowrap">{fmt(Number(l.price))} lei</td>
                  <td className="px-3 py-2 text-right">
                    {/* Editable in place — the printed copy shows the number. */}
                    <input
                      type="number"
                      min={0}
                      max={9999}
                      step={1}
                      aria-label={`Bucăți disponibile pentru ${l.title}`}
                      value={edits[l.id] ?? String(stockOf(l))}
                      onChange={(e) => setEdits((p) => ({ ...p, [l.id]: e.target.value }))}
                      className={`w-16 text-right rounded-lg border-[1.5px] px-2 py-1 bg-paper focus:outline-none focus:border-clay ${
                        isChanged ? 'border-clay bg-clay-soft/40' : qty === 0 ? 'border-destructive/40' : 'border-line-strong'
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2 text-right price whitespace-nowrap hidden sm:table-cell">
                    {fmt(qty * Number(l.price))} lei
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-faint mt-2">
        Un produs cu 0 bucăți apare ca vândut pe site. Mărește numărul ca să-l repui în vânzare.
      </p>

      {/* Save bar — only when something actually changed */}
      {changed.length > 0 && (
        <div className="sticky bottom-20 lg:bottom-4 mt-4 rounded-2xl border-[1.5px] border-clay/50 bg-clay-soft/70 backdrop-blur px-4 py-3 flex items-center justify-between gap-3 flex-wrap no-print">
          <p className="text-sm text-ink">
            {changed.length} {changed.length === 1 ? 'produs modificat' : 'produse modificate'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEdits({})} disabled={saving}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Anulează
            </Button>
            <Button size="sm" className="rounded-full" onClick={save} disabled={saving || saved}>
              {saved ? <Check className="w-4 h-4 mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
              {saved ? 'Salvat' : saving ? 'Se salvează…' : 'Salvează stocul'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border-[1.5px] border-line-strong bg-surface px-3 py-2.5">
      <div className="font-display text-lg text-ink leading-tight">{value}</div>
      <div className="text-xs text-ink-soft">{label}</div>
    </div>
  );
}
