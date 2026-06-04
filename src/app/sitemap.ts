import type { MetadataRoute } from 'next';
import { fetchListingIdsServer } from '@/lib/data/listings.server';

const BASE = 'https://craftology-peach.vercel.app';

export const revalidate = 3600; // refresh the sitemap hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/search`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/returns`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const listings = await fetchListingIdsServer();
  const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${BASE}/listings/${l.id}`,
    lastModified: new Date(l.created_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...listingRoutes];
}
