import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchListingByIdServer } from '@/lib/data/listings.server';
import { ListingDetailClient } from './ListingDetailClient';

// A product is fixed content — server-render it (fast LCP + real SEO) and cache
// with ISR. The interactive bits live in ListingDetailClient.
export const revalidate = 300;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListingByIdServer(id);
  if (!listing) return { title: 'Produs negăsit' };

  const price = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(listing.price);
  const description = `${price} lei · ${listing.description?.slice(0, 140) ?? ''}`.trim();
  const image = listing.image_urls?.[0];

  return {
    title: listing.title,
    description,
    openGraph: {
      title: listing.title,
      description,
      type: 'website',
      images: image ? [{ url: image }] : [],
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: listing.title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function ListingDetailPage({ params }: Params) {
  const { id } = await params;
  const listing = await fetchListingByIdServer(id);
  if (!listing) notFound();

  // Product structured data → rich Google results (price + availability).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    image: listing.image_urls ?? [],
    category: listing.category,
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: 'RON',
      availability: listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ListingDetailClient listing={listing} />
    </>
  );
}

