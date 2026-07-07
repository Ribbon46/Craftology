'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { CATEGORIES, SUBCATEGORIES, MESSAGES, type CategoryKey } from '@/config/app';
import { fetchListingsPage, type ListingsPage, type SortOption } from '@/lib/data/listings';
import { Listing } from '@/lib/mock';
import { PullToRefresh } from '@/components/PullToRefresh';
import { CategoryChips } from '@/components/CategoryChips';
import { FeedControls } from '@/components/FeedControls';
import { ListingCard, ListingGridSkeleton } from '@/components/ListingCard';
import { QRShare } from '@/components/QRShare';

// Client feed island. The first "all" page is fetched on the server (page.tsx)
// and passed in as `initialPage`, so the grid is in the initial HTML (fast LCP +
// SEO) while infinite scroll, category switching, and pull-to-refresh stay
// client-side. React Query is seeded so the default view doesn't refetch on mount.
export function HomeFeed({ initialPage }: { initialPage: ListingsPage }) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeSub, setActiveSub] = useState<string>('all');
  // /auth/confirm redirects here with ?auth=confirmare_esuata when a
  // confirmation link is expired/already used — surface it, don't drop it.
  const [confirmFailed, setConfirmFailed] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('auth') === 'confirmare_esuata') {
      setConfirmFailed(true);
      window.history.replaceState(null, '', '/');
    }
  }, []);
  const [sort, setSort] = useState<SortOption>('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const min = minPrice !== '' ? Number(minPrice) : undefined;
  const max = maxPrice !== '' ? Number(maxPrice) : undefined;
  const subFilter = activeSub !== 'all' ? activeSub : undefined;
  // initialData (server-rendered first page) only applies to the exact default
  // view — otherwise a sort/filter change would briefly show stale default data.
  const isDefaultView =
    activeCategory === 'all' && activeSub === 'all' && sort === 'newest' && minPrice === '' && maxPrice === '';

  const onCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setActiveSub('all'); // subcategories belong to a category — reset on switch
  };

  const { data, error, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, status, refetch } =
    useInfiniteQuery({
      queryKey: ['listings', activeCategory, activeSub, sort, min ?? null, max ?? null],
      queryFn: ({ pageParam }) =>
        fetchListingsPage({ cursor: pageParam, category: activeCategory, subcategory: subFilter, sort, minPrice: min, maxPrice: max }),
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
      {/* Category filter — sticks under the header (offset adapts to header height).
          A second row of subcategory chips appears once a top-level category is picked. */}
      <div className="sticky top-16 lg:top-[72px] z-30 bg-paper/90 backdrop-blur-md border-b border-line">
        <div className="mx-auto w-full max-w-6xl px-4 lg:px-8 py-3 space-y-2">
          <CategoryChips
            options={[{ key: 'all', label: 'Toate' }, ...Object.entries(CATEGORIES).map(([key, label]) => ({ key, label }))]}
            active={activeCategory}
            onChange={onCategoryChange}
          />
          {activeCategory !== 'all' && (
            <CategoryChips
              options={[
                { key: 'all', label: 'Toate' },
                ...SUBCATEGORIES[activeCategory as CategoryKey].map((sub) => ({ key: sub, label: sub })),
              ]}
              active={activeSub}
              onChange={setActiveSub}
            />
          )}
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 lg:px-8">
        {/* Editorial hero — compact on phone, full headline on desktop. The
            decorations (dot grid + paper confetti) live behind the text and
            only on lg+ so phones stay clean. */}
        <header className="relative pt-5 lg:pt-14 mb-5 lg:mb-10">
          <p className="text-[11px] uppercase tracking-[0.25em] text-clay mb-1 lg:mb-3">Handmade Românesc</p>
          <div className="relative max-w-3xl">
            {/* Paper-confetti collage hugging the headline's right edge —
                anchored to the heading box so it composes at any width */}
            <div aria-hidden className="pointer-events-none absolute top-1 right-0 hidden lg:block">
              <div className="dot-grid absolute -top-10 -right-24 w-64 h-40 opacity-80 [mask-image:radial-gradient(closest-side,black,transparent)]" />
              <span className="absolute -top-7 right-8 w-10 h-10 rounded-full border-[2.5px] border-clay/60 rotate-6" />
              <span className="absolute top-7 -right-1 w-6 h-6 bg-sage/50 border-[1.5px] border-edge/30 rounded-[5px] rotate-12 shadow-[2px_2px_0_0_var(--press-soft)]" />
              <span className="absolute top-14 right-14 w-8 h-4 bg-gold/45 border-[1.5px] border-edge/30 rounded-full -rotate-12 shadow-[2px_2px_0_0_var(--press-soft)]" />
            </div>
            <h1 className="relative font-display text-[26px] lg:text-[52px] leading-[1.05] text-ink text-balance">
              {activeCategory === 'all' ? (
                <>
                  Lucrate manual, <span className="squiggle-underline">cu suflet</span>
                </>
              ) : (
                CATEGORIES[activeCategory as keyof typeof CATEGORIES]
              )}
            </h1>
          </div>
          <p className="hidden lg:block text-lg text-ink-soft mt-4 max-w-xl leading-relaxed">
            Produse handmade de la creatori români verificați. Fiecare produs este lucrat cu pasiune.
          </p>
          {!isInitialLoading && (
            <p className="text-sm text-ink-soft mt-1 lg:mt-5">
              {listings.length} {listings.length === 1 ? 'produs disponibil' : 'produse disponibile'}
            </p>
          )}
          <div className="hidden lg:block rule-craft w-24 mt-7" />
        </header>

        {confirmFailed && (
          <div className="mb-5 p-4 rounded-2xl border-[1.5px] border-clay/45 bg-clay-soft/50 text-sm text-ink flex items-start justify-between gap-3">
            <span>
              Linkul de confirmare a expirat sau a fost deja folosit. Încearcă să te autentifici — dacă nu merge,
              înregistrează-te din nou și vei primi un email nou.
            </span>
            <button onClick={() => setConfirmFailed(false)} className="text-ink-faint hover:text-ink shrink-0" aria-label="Închide">
              ✕
            </button>
          </div>
        )}

        {activeCategory === 'all' && activeSub === 'all' && (
          <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 mb-5 lg:mb-7 [&>*]:mb-0">
            <QRShare />
            {/* Owner requirement: a big, obvious return/refund entry point on the
                home screen (consumer-rights visibility), not just in the account. */}
            <div className="flex flex-col justify-center rounded-2xl border-[1.5px] border-line-strong bg-surface/70 shadow-[3px_3px_0_0_var(--press-soft)] p-4 max-w-sm">
              <p className="font-display text-ink leading-tight mb-0.5">Ai comandat ceva?</p>
              <p className="text-xs text-ink-soft mb-3">Ai drept de retur în 14 zile de la primire.</p>
              <a
                href="/profile"
                className="inline-flex items-center justify-center rounded-full border-[1.5px] border-clay/45 text-clay px-4 py-2 text-sm font-medium hover:bg-clay hover:text-paper transition-colors"
              >
                Cerere retur / rambursare
              </a>
              <p className="text-[11px] text-ink-faint mt-2">
                Fără cont? Folosește linkul din pagina comenzii sau scrie-ne la info.craftology.shop@gmail.com.
              </p>
            </div>
          </div>
        )}

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
            <div className="w-16 h-16 rounded-full bg-clay-soft grid place-items-center mb-4 -rotate-3 border-[1.5px] border-clay/35 shadow-[3px_3px_0_0_var(--press-soft)]">
              <Star className="w-7 h-7 text-clay" strokeWidth={2.25} />
            </div>
            <h3 className="font-display text-lg text-ink mb-1.5 text-balance">{MESSAGES.noListings}</h3>
            {activeCategory !== 'all' && (
              <button onClick={() => onCategoryChange('all')} className="text-clay text-sm underline underline-offset-4 mt-1">
                Vezi toate categoriile
              </button>
            )}
          </div>
        ) : (
          <>
            {activeCategory === 'all' && activeSub === 'all' && (
              <h2 className="font-display text-xl lg:text-2xl text-ink mb-4">✨ Adăugate recent</h2>
            )}
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

        {/* Mini-guide: how to become a seller (per the owner's request) */}
        <section className="mt-4 mb-10 rounded-2xl border-[1.5px] border-line-strong bg-surface shadow-[4px_4px_0_0_var(--press-soft)] p-5 lg:p-7">
          <h2 className="font-display text-xl lg:text-2xl text-ink mb-1">Vinzi produse handmade?</h2>
          <p className="text-sm text-ink-soft mb-4">Devino vânzător pe Craft&apos;zaar în câțiva pași simpli:</p>
          <ol className="space-y-2 text-sm text-ink-soft mb-5">
            {[
              'Creează-ți un cont gratuit și confirmă emailul.',
              'Completează cererea de vânzător cu datele firmei tale (SRL / PFA + CUI).',
              'Noi verificăm și aprobăm cererea — primești email de confirmare.',
              'Configurezi plățile prin Stripe (banii ajung direct în contul tău).',
              'Publici produsele și începi să vinzi!',
            ].map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-clay text-paper text-[11px] font-bold grid place-items-center shrink-0 mt-px">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <a
            href="/seller/apply"
            className="inline-flex items-center rounded-full bg-clay text-paper px-5 py-2.5 text-sm font-medium border-[1.5px] border-edge shadow-[3px_3px_0_0_var(--press)] hover:bg-clay-deep transition-colors"
          >
            Devino vânzător
          </a>
        </section>
      </main>
      </div>
    </PullToRefresh>
  );
}
