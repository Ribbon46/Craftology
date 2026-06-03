'use client';

import { useRef, useCallback, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import Link from 'next/link';
import { CATEGORIES, MESSAGES } from '@/config/app';
import { fetchListingsPage } from '@/lib/data/listings';
import { Listing } from '@/lib/mock';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const { data, error, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: ['listings', activeCategory],
      queryFn: ({ pageParam }) => fetchListingsPage({ cursor: pageParam, category: activeCategory }),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: 0 as number | null,
    });

  const observer = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetching) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) fetchNextPage();
      });
      if (node) observer.current.observe(node);
    },
    [isFetching, hasNextPage, fetchNextPage],
  );

  const listings: Listing[] = data?.pages.flatMap((page) => page.data) ?? [];

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(price);

  if (status === 'pending') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="font-display italic text-ink-soft">Se încarcă produse…</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center">
        <p className="text-clay-deep mb-3">Eroare la încărcare: {(error as Error).message}</p>
        <button onClick={() => window.location.reload()} className="px-5 py-2 rounded-full bg-ink text-paper text-sm">
          Încearcă din nou
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Category filter — sticks below the brand nav */}
      <div className="sticky top-16 z-30 bg-paper/90 backdrop-blur-md border-b border-line">
        <div className="px-4 py-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setActiveCategory('all')}
              className={`chip ${activeCategory === 'all' ? 'chip-active' : 'chip-inactive'}`}
            >
              Toate
            </button>
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`chip ${activeCategory === key ? 'chip-active' : 'chip-inactive'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="px-4 pt-5 pb-6">
        <header className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.25em] text-clay mb-1">Atelier</p>
          <h1 className="font-display text-[26px] leading-tight text-ink text-balance">
            {activeCategory === 'all'
              ? 'Lucrate manual, cu suflet'
              : CATEGORIES[activeCategory as keyof typeof CATEGORIES]}
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            {listings.length} {listings.length === 1 ? 'produs disponibil' : 'produse disponibile'}
          </p>
        </header>

        {listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-clay-soft grid place-items-center mb-4">
              <Star className="w-7 h-7 text-clay" />
            </div>
            <h3 className="font-display text-lg text-ink mb-1.5 text-balance">{MESSAGES.noListings}</h3>
            {activeCategory !== 'all' && (
              <button onClick={() => setActiveCategory('all')} className="text-clay text-sm underline underline-offset-4 mt-1">
                Vezi toate categoriile
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {listings.map((listing, i) => (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="atelier-card reveal block"
                  style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-cream group">
                    {listing.image_urls?.[0] ? (
                      <img
                        src={listing.image_urls[0]}
                        alt={listing.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-ink-faint text-xs">Fără imagine</div>
                    )}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-paper/90 backdrop-blur-sm text-[9px] font-semibold uppercase tracking-wider text-clay">
                      {listing.category}
                    </span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-display text-[15px] leading-snug text-ink line-clamp-2 min-h-[2.5em] mb-1">
                      {listing.title}
                    </h3>
                    <span className="price text-lg font-semibold text-ink">{formatPrice(listing.price)}</span>
                    <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-line/70 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-cream overflow-hidden flex-shrink-0 ring-1 ring-line">
                        {listing.profiles?.avatar_url ? (
                          <img src={listing.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="grid place-items-center w-full h-full text-[9px] font-semibold text-ink-soft">
                            {listing.profiles?.username?.charAt(0).toUpperCase() ?? 'V'}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-ink-soft truncate min-w-0">
                        {listing.profiles?.username ?? 'vânzător'}
                      </span>
                      {listing.profiles?.rating != null && (
                        <span className="ml-auto flex items-center gap-0.5 text-[11px] font-medium text-gold flex-shrink-0">
                          <Star className="w-3 h-3 fill-gold" />
                          {listing.profiles.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {isFetchingNextPage && (
              <div className="py-6 flex justify-center">
                <div className="w-6 h-6 border-2 border-clay border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!hasNextPage && (
              <div className="py-10 text-center">
                <div className="rule-craft w-16 mx-auto mb-3" />
                <p className="font-display italic text-ink-soft text-sm">{MESSAGES.endOfFeed}</p>
              </div>
            )}

            <div ref={sentinelRef} className="h-1" />
          </>
        )}
      </main>
    </div>
  );
}
