'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, SearchX } from 'lucide-react';
import { CATEGORIES, SUBCATEGORIES, type CategoryKey } from '@/config/app';
import { searchListings, fetchArtisans, type ArtisanOption, type SortOption } from '@/lib/data/listings';
import { Listing } from '@/lib/mock';
import { CategoryChips } from '@/components/CategoryChips';
import { SortSelect } from '@/components/SortSelect';
import { ListingCard, ListingGridSkeleton } from '@/components/ListingCard';

const CATEGORY_OPTIONS = [{ id: 'all', label: 'Toate' }].concat(
  Object.entries(CATEGORIES).map(([id, label]) => ({ id, label })),
);

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSub, setSelectedSub] = useState('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [artisan, setArtisan] = useState('');
  const [artisans, setArtisans] = useState<ArtisanOption[]>([]);
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArtisans().then(setArtisans).catch(() => {});
  }, []);

  const onCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedSub('all');
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    const sub = selectedSub !== 'all' ? selectedSub : undefined;
    searchListings(searchQuery, selectedCategory, sort, sub, artisan || undefined)
      .then((r) => {
        if (active) setResults(r);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [searchQuery, selectedCategory, selectedSub, sort, artisan]);

  return (
    <div className="min-h-screen pb-20 pt-4 mx-auto w-full max-w-6xl">
      <div className="px-4 lg:px-8 mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-ink-faint" />
          <Input
            type="text"
            placeholder="Caută produse, vânzători…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <CategoryChips
          options={CATEGORY_OPTIONS.map((c) => ({ key: c.id, label: c.label }))}
          active={selectedCategory}
          onChange={onCategoryChange}
          className="pb-2"
        />
        {selectedCategory !== 'all' && (
          <CategoryChips
            options={[
              { key: 'all', label: 'Toate' },
              ...SUBCATEGORIES[selectedCategory as CategoryKey].map((sub) => ({ key: sub, label: sub })),
            ]}
            active={selectedSub}
            onChange={setSelectedSub}
            className="pb-2"
          />
        )}
      </div>

      <div className="px-4 lg:px-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-lg text-ink min-w-0 truncate">
            {searchQuery ? (
              <>Rezultate pentru „{searchQuery}”</>
            ) : (
              <>
                Toate produsele
                {!loading && <span className="text-ink-faint"> · {results.length}</span>}
              </>
            )}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={artisan}
              onChange={(e) => setArtisan(e.target.value)}
              aria-label="Filtrează după artizan"
              className="h-10 max-w-[10.5rem] rounded-full border-[1.5px] border-line bg-surface px-3 text-sm text-ink-soft focus:outline-none focus:border-clay"
            >
              <option value="">Toți artizanii</option>
              {artisans.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <SortSelect value={sort} onChange={setSort} />
          </div>
        </div>

        {loading ? (
          <ListingGridSkeleton count={8} />
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-clay-soft grid place-items-center mb-4 -rotate-3 border-[1.5px] border-clay/35 shadow-[3px_3px_0_0_var(--press-soft)]">
              <SearchX className="w-7 h-7 text-clay" strokeWidth={2.25} />
            </div>
            <h3 className="font-display text-lg text-ink mb-1.5">Nu am găsit produse.</h3>
            <p className="text-sm text-ink-soft">Încearcă să cauți după alt termen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-6 pb-10">
            {results.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
