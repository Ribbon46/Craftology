'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { SortOption } from '@/lib/data/listings';
import { SortSelect } from '@/components/SortSelect';

export function FeedControls({
  sort,
  onSortChange,
  minPrice,
  maxPrice,
  onPriceChange,
}: {
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  minPrice: string;
  maxPrice: string;
  onPriceChange: (min: string, max: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(minPrice);
  const [max, setMax] = useState(maxPrice);
  const priceActive = minPrice !== '' || maxPrice !== '';

  const apply = () => {
    onPriceChange(min, max);
    setOpen(false);
  };
  const reset = () => {
    setMin('');
    setMax('');
    onPriceChange('', '');
    setOpen(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Sort */}
        <SortSelect value={sort} onChange={onSortChange} />

        {/* Price filter toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-4 py-2 text-sm transition-colors ${
            priceActive
              ? 'border-clay/50 text-clay bg-clay/10'
              : 'border-line text-ink-soft hover:text-ink hover:border-clay/40'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtre
          {priceActive && <span className="w-1.5 h-1.5 rounded-full bg-clay" />}
        </button>
        {priceActive && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-ink-faint hover:text-clay underline underline-offset-2"
          >
            Resetează
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 flex items-end gap-3 flex-wrap rounded-2xl border-[1.5px] border-line-strong bg-surface shadow-[4px_4px_0_0_var(--press-soft)] p-4 animate-fade-in">
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Preț minim (lei)
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="0"
              className="w-28 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Preț maxim (lei)
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="∞"
              className="w-28 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
          </label>
          <button
            type="button"
            onClick={apply}
            className="rounded-full bg-clay text-paper px-5 py-2 text-sm font-medium hover:bg-clay-deep transition-colors"
          >
            Aplică
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-line text-ink-soft px-4 py-2 text-sm hover:text-ink transition-colors"
          >
            Resetează
          </button>
        </div>
      )}
    </div>
  );
}
