import type { MetadataRoute } from 'next';

// PWA manifest — makes Craft'zaar installable on iOS (Add to Home Screen) and
// Android home screens as a full-screen, app-like experience.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Craft'zaar — Handmade Românesc",
    short_name: "Craft'zaar",
    description: 'Marketplace de produse handmade românești — bijuterii, haine, lumânări, accesorii, frumusețe.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f0e4',
    theme_color: '#f6f0e4',
    lang: 'ro',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
