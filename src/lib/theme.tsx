'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'craftology-theme';

/** Resolve the effective theme: an explicit saved choice wins; otherwise we
 *  follow the device's system toggle (so dark phones open in dark). Mirrors the
 *  pre-paint inline script in layout.tsx — keep them in sync. */
function resolveInitial(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* private mode / disabled storage — fall through to system */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', t === 'dark');
  root.style.colorScheme = t;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The pre-paint script already set the class; mirror it into React state.
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const initial = resolveInitial();
    setThemeState(initial);
    applyTheme(initial);

    // If the user never made an explicit choice, keep following the system.
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return; // honour explicit choice
      } catch {
        /* ignore */
      }
      const next: Theme = e.matches ? 'dark' : 'light';
      setThemeState(next);
      applyTheme(next);
    };
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
