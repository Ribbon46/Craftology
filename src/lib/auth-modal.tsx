'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthModalContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

/**
 * Provides global control of the authentication modal so any screen (the
 * +Vinde gate, "Trimite mesaj", etc.) can prompt the user to sign in.
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AuthModalContext.Provider value={{ open, setOpen }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return ctx;
}
