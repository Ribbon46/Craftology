'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Star, ArrowDownUp, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { CATEGORIES } from '@/config/app';
import { searchListings, type SortOption } from '@/lib/data/listings';
import { Listing } from '@/lib/mock';
import { CategoryChips } from '@/components/CategoryChips';

const CATEGORY_OPTIONS = [{ id: 'all', label: 'Toate' }].concat(
  Object.entries(CATEGORIES).map(([id, label]) => ({ id, label })),
);

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    searchListings(searchQuery, selectedCategory, sort)
      .then((r) => {
        if (active) setResults(r);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [searchQuery, selectedCategory, sort]);

  return (
    <div className="min-h-screen pb-20 pt-4 mx-auto w-full max-w-5xl">
      <div className="px-4 mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-ink-faint" />
          <Input
            type="text"
            placeholder="Caută produse, vânzători..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <CategoryChips
          options={CATEGORY_OPTIONS.map((c) => ({ key: c.id, label: c.label }))}
          active={selectedCategory}
          onChange={setSelectedCategory}
          className="pb-2"
        />
      </div>

      <div className="px-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-ink min-w-0 truncate">
            {searchQuery ? `Rezultate pentru: "${searchQuery}"` : `Toate produsele (${results.length})`}
          </h2>
          <div className="relative flex-shrink-0">
            <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
            <select
              aria-label="Sortează"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="appearance-none rounded-full border border-line bg-surface text-ink text-sm pl-9 pr-9 py-2 hover:border-clay/40 focus:outline-none focus:ring-2 focus:ring-clay/30 cursor-pointer"
            >
              <option value="newest">Cele mai noi</option>
              <option value="price_asc">Preț: mic → mare</option>
              <option value="price_desc">Preț: mare → mic</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-ink-soft">Se încarcă...</div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-ink-soft">
            <p className="mb-2">Nu am găsit produse.</p>
            <p className="text-sm">Încearcă să cauți după alt termen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <Card className="overflow-hidden border-line transition-all active:scale-[0.98]">
                  <div className="relative aspect-square w-full overflow-hidden bg-cream">
                    <Image
                      src={listing.image_urls[0]}
                      alt={listing.title}
                      fill
                      sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-medium text-ink-soft">{listing.category}</span>
                      {listing.profiles?.rating != null && (
                        <div className="flex items-center space-x-0.5 text-gold">
                          <Star size={12} fill="currentColor" />
                          <span className="text-xs font-medium">{listing.profiles.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-ink mb-1 line-clamp-1">{listing.title}</h3>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink flex-shrink-0">{listing.price} lei</span>
                      <span className="text-xs text-ink-soft truncate min-w-0">
                        de {listing.profiles?.username ?? 'vânzător'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
