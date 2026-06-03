import type { Metadata, Viewport } from 'next';
import { Fraunces, Hanken_Grotesk } from 'next/font/google';
import { BottomNav } from '@/components/navigation/BottomNav';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { SiteFooter } from '@/components/navigation/SiteFooter';
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
  title: { default: APP_NAME_FULL, template: '%s · Craftology' },
  description: DESCRIPTION,
  applicationName: 'Craftology',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Craftology' },
  openGraph: {
    title: APP_NAME_FULL,
    description: DESCRIPTION,
    siteName: 'Craftology',
    locale: 'ro_RO',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#f6f0e4',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className={`${fraunces.variable} ${hanken.variable}`}>
      <body className="paper-grain min-h-screen bg-cream text-ink font-sans">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <SiteHeader />
            {/* Mobile keeps bottom-nav clearance; desktop hands spacing to the footer */}
            <main className="flex-1 pb-28 lg:pb-0">{children}</main>
            <SiteFooter />
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
