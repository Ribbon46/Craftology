import type { MetadataRoute } from 'next';

const BASE = 'https://craftology-peach.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private / account-only areas — no value being indexed.
      disallow: ['/messages', '/profile', '/sell', '/checkout', '/admin'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
