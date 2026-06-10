'use client';

import { useRef, useCallback, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { CATEGORIES, MESSAGES } from '@/config/app';
import { fetchListingsPage, type ListingsPage, type SortOption } from '@/lib/data/listings';
import { Listing } from '@/lib/mock';
import { PullToRefresh } from '@/components/PullToRefresh';
import { CategoryChips } from '@/components/CategoryChips';
import { FeedControls } from '@/components/FeedControls';
import { ListingCard, ListingGridSkeleton } from '@/components/ListingCard';

// Client feed island. The first "all" page is fetched on the server (page.tsx)
// and passed in as `initialPage`, so the grid is in the initial HTML (fast LCP +
// SEO) while infinite scroll, category switching, and pull-to-refresh stay
// client-side. React Query is seeded so the default view doesn't refetch on mount.
export function HomeFeed({ initialPage }: { initialPage: ListingsPage }) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const min = minPrice !== '' ? Number(minPrice) : undefined;
  const max = maxPrice !== '' ? Number(maxPrice) : undefined;
  // initialData (server-rendered first page) only applies to the exact default
  // view — otherwise a sort/filter change would briefly show stale default data.
  const isDefaultView = activeCategory === 'all' && sort === 'newest' && minPrice === '' && maxPrice === '';

  const { data, error, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, status, refetch } =
    useInfiniteQuery({
      queryKey: ['listings', activeCategory, sort, min ?? null, max ?? null],
      queryFn: ({ pageParam }) =>
        fetchListingsPage({ cursor: pageParam, category: activeCategory, sort, minPrice: min, maxPrice: max }),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: 0 as number | null,
      initialData: isDefaultView ? { pages: [initialPage], pageParams: [0 as number | null] } : undefined,
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
  // Pending with no cached data yet (e.g. switching to a fresh category) shows
  // skeleton cards in place of the grid — chips + hero stay put, no flash. The
  // default "all" view is seeded from the server, so this won't show on load.
  const isInitialLoading = !data;

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <div className="min-h-screen">
      {/* Category filter — sticks under the header (offset adapts to header height) */}
      <div className="sticky top-16 lg:top-[72px] z-30 bg-paper/90 backdrop-blur-md border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-4 lg:px-8 py-3">
          <CategoryChips
            options={[{ key: 'all', label: 'Toate' }, ...Object.entries(CATEGORIES).map(([key, label]) => ({ key, label }))]}
            active={activeCategory}
            onChange={setActiveCategory}
          />
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 lg:px-8">
        {/* Editorial hero — compact on phone, full headline on desktop */}
        <header className="pt-5 lg:pt-14 mb-5 lg:mb-10">
          <p className="text-[11px] uppercase tracking-[0.25em] text-clay mb-1 lg:mb-3">Atelier · Deco Kubik</p>
          <h1 className="font-display text-[26px] lg:text-[52px] leading-[1.05] text-ink text-balance max-w-3xl">
            {activeCategory === 'all' ? 'Lucrate manual, cu suflet' : CATEGORIES[activeCategory as keyof typeof CATEGORIES]}
          </h1>
          <p className="hidden lg:block text-lg text-ink-soft mt-4 max-w-xl leading-relaxed">
            Piese unicat de la creatori români verificați — fiecare produs, făcut cu mâna.
          </p>
          {!isInitialLoading && (
            <p className="text-sm text-ink-soft mt-1 lg:mt-5">
              {listings.length} {listings.length === 1 ? 'produs disponibil' : 'produse disponibile'}
            </p>
          )}
          <div className="hidden lg:block rule-craft w-24 mt-7" />
        </header>

        <div className="mb-5 lg:mb-7">
          <FeedControls
            sort={sort}
            onSortChange={setSort}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onPriceChange={(mn, mx) => {
              setMinPrice(mn);
              setMaxPrice(mx);
            }}
          />
        </div>

        {isInitialLoading ? (
          <ListingGridSkeleton />
        ) : listings.length === 0 ? (
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-6 pb-10">
              {listings.map((listing, i) => (
                <ListingCard key={listing.id} listing={listing} index={i} />
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
    </PullToRefresh>
  );
}
