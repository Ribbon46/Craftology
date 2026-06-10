import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import type { Listing } from '@/lib/mock';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(price);

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Astăzi';
  if (days === 1) return 'Ieri';
  if (days < 7) return `${days} zile în urmă`;
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'numeric' });
};

/**
 * The product card — one source of truth for every grid in the app (home feed,
 * search results), so a listing looks identical wherever it appears.
 * `index` drives the staggered reveal + eager image loading for the first row.
 */
export function ListingCard({ listing, index = 0 }: { listing: Listing; index?: number }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="atelier-card reveal block"
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-cream group">
        {listing.image_urls?.[0] ? (
          <Image
            src={listing.image_urls[0]}
            alt={listing.title}
            fill
            priority={index < 4}
            sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-ink-faint text-xs">Fără imagine</div>
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-paper/90 backdrop-blur-sm text-[9px] font-semibold uppercase tracking-wider text-clay">
          {listing.category}
        </span>
      </div>
      <div className="p-3 lg:p-4">
        <h3 className="font-display text-[15px] lg:text-base leading-snug text-ink line-clamp-2 min-h-[2.5em] mb-1">
          {listing.title}
        </h3>
        <div className="flex items-baseline justify-between gap-2">
          <span className="price text-lg lg:text-xl font-semibold text-ink">{formatPrice(listing.price)}</span>
          <span className="hidden lg:block text-xs text-ink-faint">{formatTimeAgo(listing.created_at)}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-line/70 min-w-0">
          <div className="w-5 h-5 rounded-full bg-cream overflow-hidden flex-shrink-0 ring-1 ring-line">
            {listing.profiles?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="grid place-items-center w-full h-full text-[9px] font-semibold text-ink-soft">
                {listing.profiles?.username?.charAt(0).toUpperCase() ?? 'V'}
              </span>
            )}
          </div>
          <span className="text-[11px] text-ink-soft truncate min-w-0">{listing.profiles?.username ?? 'vânzător'}</span>
          {listing.profiles?.rating != null && (
            <span className="ml-auto flex items-center gap-0.5 text-[11px] font-medium text-gold flex-shrink-0">
              <Star className="w-3 h-3 fill-gold" />
              {listing.profiles.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Loading placeholder matching the card's exact proportions (no layout shift). */
export function ListingCardSkeleton() {
  return (
    <div className="atelier-card" aria-hidden>
      <div className="aspect-[4/5] bg-cream animate-pulse" />
      <div className="p-3 lg:p-4">
        <div className="h-4 w-4/5 rounded bg-cream animate-pulse mb-2" />
        <div className="h-5 w-2/5 rounded bg-cream animate-pulse" />
        <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-line/70">
          <div className="w-5 h-5 rounded-full bg-cream animate-pulse flex-shrink-0" />
          <div className="h-3 w-16 rounded bg-cream animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** A grid of skeleton cards sharing the exact grid classes of the real feed. */
export function ListingGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-6 pb-10">
      {Array.from({ length: count }, (_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
