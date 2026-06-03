'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';
import { AuthModalProvider } from '@/lib/auth-modal';
import { AuthModal } from '@/components/auth/AuthModal';

/**
 * Client-side provider tree. Kept separate so the root layout can remain a
 * Server Component (Next.js App Router convention).
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthModalProvider>
        {children}
        {/* Single, globally-controlled auth modal */}
        <AuthModal />
      </AuthModalProvider>
    </QueryClientProvider>
  );
}
