'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';
import { AuthModalProvider } from '@/lib/auth-modal';
import { ThemeProvider } from '@/lib/theme';
import { AuthModal } from '@/components/auth/AuthModal';
import { BackButtonHandler } from '@/components/BackButtonHandler';

/**
 * Client-side provider tree. Kept separate so the root layout can remain a
 * Server Component (Next.js App Router convention).
 */
export function Providers({ children }: { children: ReactNode }) {
  // A handmade-goods catalog changes slowly — keep fetched pages warm across
  // navigation/category toggles and don't refetch on window focus, to cut
  // redundant Supabase queries and bytes on metered mobile connections.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthModalProvider>
          {children}
          {/* Single, globally-controlled auth modal */}
          <AuthModal />
          {/* Native Android Back → previous screen instead of exit */}
          <BackButtonHandler />
        </AuthModalProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
