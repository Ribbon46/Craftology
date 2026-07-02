import type { Metadata, Viewport } from 'next';
import { Fraunces, Hanken_Grotesk } from 'next/font/google';
import { BottomNav } from '@/components/navigation/BottomNav';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { SiteFooter } from '@/components/navigation/SiteFooter';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Providers } from './providers';
import { APP_NAME_FULL } from '@/config/app';
import './globals.css';

// Display: a soft optical serif with real character (artisanal, editorial).
// Body: a clean humanist grotesque. Both include latin-ext for RO diacritics.
const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});
const hanken = Hanken_Grotesk({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-hanken',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const DESCRIPTION =
  'Marketplace curat de produse handmade românești — bijuterii, haine, lumânări, accesorii și frumusețe. Vânzători verificați.';

export const metadata: Metadata = {
  metadataBase: new URL('https://craftology-peach.vercel.app'),
  title: { default: APP_NAME_FULL, template: "%s · Craft'zaar" },
  description: DESCRIPTION,
  applicationName: "Craft'zaar",
  appleWebApp: { capable: true, statusBarStyle: 'default', title: "Craft'zaar" },
  openGraph: {
    title: APP_NAME_FULL,
    description: DESCRIPTION,
    siteName: "Craft'zaar",
    locale: 'ro_RO',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // No maximumScale / user-scalable:false — users must be able to pinch-zoom
  // (WCAG 1.4.4). Proper touch targets make double-tap-zoom suppression moot.
  viewportFit: 'cover',
  // Status-bar / browser-chrome colour follows the device theme.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f0e4' },
    { media: '(prefers-color-scheme: dark)', color: '#17120f' },
  ],
};

// Runs before paint so the theme is correct on first frame (no flash).
// An explicit saved choice wins; otherwise we follow the device's dark toggle.
// Keep in sync with src/lib/theme.tsx.
const THEME_INIT = `(function(){try{var k='craftology-theme',s=localStorage.getItem(k),d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var e=document.documentElement;if(d)e.classList.add('dark');e.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className={`${fraunces.variable} ${hanken.variable}`} suppressHydrationWarning>
      <body className="paper-grain min-h-screen bg-cream text-ink font-sans">
        {/* Runs before paint → correct theme on first frame (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <Providers>
          <div className="min-h-screen flex flex-col">
            <SiteHeader />
            {/* Mobile keeps bottom-nav clearance; desktop hands spacing to the footer */}
            <main className="flex-1 pb-28 lg:pb-0">{children}</main>
            <SiteFooter />
            <BottomNav />
          </div>
        </Providers>
        {/* Production traffic + Core Web Vitals (no-op off Vercel) */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
