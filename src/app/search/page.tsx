'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Star } from 'lucide-react';
import Link from 'next/link';
import { CATEGORIES } from '@/config/app';
import { searchListings } from '@/lib/data/listings';
import { Listing } from '@/lib/mock';

const CATEGORY_OPTIONS = [{ id: 'all', label: 'Toate' }].concat(
  Object.entries(CATEGORIES).map(([id, label]) => ({ id, label })),
);

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    searchListings(searchQuery, selectedCategory)
      .then((r) => {
        if (active) setResults(r);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen pb-20 pt-4">
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

        <div className="flex space-x-2 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORY_OPTIONS.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category.id
                  ? 'bg-ink text-white'
                  : 'bg-cream text-ink hover:bg-line'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">
            {searchQuery ? `Rezultate pentru: "${searchQuery}"` : `Toate produsele (${results.length})`}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-ink-soft">Se încarcă...</div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-ink-soft">
            <p className="mb-2">Nu am găsit produse.</p>
            <p className="text-sm">Încearcă să cauți după alt termen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <Card className="overflow-hidden border-line transition-all active:scale-[0.98]">
                  <div className="aspect-square w-full overflow-hidden bg-cream">
                    <img
                      src={listing.image_urls[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
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
