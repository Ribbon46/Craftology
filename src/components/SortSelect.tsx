'use client';

import { ArrowDownUp, ChevronDown } from 'lucide-react';
import type { SortOption } from '@/lib/data/listings';

const SORTS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Cele mai noi' },
  { value: 'price_asc', label: 'Preț: mic → mare' },
  { value: 'price_desc', label: 'Preț: mare → mic' },
];

/** The pill-shaped sort dropdown used on the home feed and the search page. */
export function SortSelect({ value, onChange }: { value: SortOption; onChange: (s: SortOption) => void }) {
  return (
    <div className="relative flex-shrink-0">
      <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
      <select
        aria-label="Sortează"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="appearance-none rounded-full border border-line bg-surface text-ink text-sm pl-9 pr-9 py-2 hover:border-clay/40 focus:outline-none focus:ring-2 focus:ring-clay/30 cursor-pointer"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
    </div>
  );
}
