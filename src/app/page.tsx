import { fetchListingsPageServer } from '@/lib/data/listings.server';
import { HomeFeed } from './HomeFeed';

// The catalog is mostly static — server-render the first page of listings (fast
// LCP + SEO) and cache with ISR; mutations call revalidatePath('/'). The feed's
// interactivity (infinite scroll, categories, pull-to-refresh) lives in HomeFeed.
export const revalidate = 60;

export default async function HomePage() {
  const initialPage = await fetchListingsPageServer({ category: 'all' });
  return <HomeFeed initialPage={initialPage} />;
}
