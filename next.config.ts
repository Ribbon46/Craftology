import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB, which rejected every real product photo upload with
      // "Body exceeded 1 MB limit" (413). 4 MB is the safe ceiling under
      // Vercel's ~4.5 MB request cap; the sell form also compresses images
      // client-side so 5 photos stay well below this.
      bodySizeLimit: "4mb",
    },
  },
  images: {
    // Hosts the app actually serves images from: Supabase storage (real
    // uploads), placehold.co (seed/mock listings), ui-avatars.com (avatars).
    // next/image then auto-serves resized AVIF/WebP + a responsive srcset.
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "ui-avatars.com" },
    ],
    // The seed/placeholder hosts (placehold.co) serve SVG, which the optimizer
    // rejects by default. Allow it — but neutralize the SVG-script risk by
    // forcing download disposition + a no-script sandbox CSP on optimized
    // output. Real user uploads remain raster-only (enforced in createListing).
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
