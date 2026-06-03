import type { CapacitorConfig } from '@capacitor/cli';

// Craftology ships as a thin native shell around the hosted Next.js app.
// The app uses Server Actions (createListing, messaging) which require a Node
// host, so it CANNOT be a static export — instead the native WebView loads the
// live Vercel deployment via `server.url`. After deploying to Vercel, set
// `server.url` to your production URL and run `npx cap sync`.
const config: CapacitorConfig = {
  appId: 'ro.decokubik.craftology',
  appName: 'Craftology',
  webDir: 'public',
  server: {
    // Live Vercel production deployment — the native shell loads this.
    url: 'https://craftology-peach.vercel.app',
    cleartext: false,
  },
  android: {
    backgroundColor: '#f6f0e4',
  },
};

export default config;
