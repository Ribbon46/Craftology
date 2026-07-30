'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Shopping cart. Handmade pieces are one-of-a-kind (a listing is a single item
 * that flips to `sold`), so the cart is a SET of listings — no quantities.
 * Stored in localStorage so guests can build a cart without an account; prices
 * and availability are always re-validated server-side at checkout.
 */
export interface CartItem {
  id: string;
  title: string;
  price: number;
  image: string | null;
  sellerId: string;
  sellerName: string;
  /** Seller's delivery cost for this item (charged once per order — the
   *  highest among the items bought from that atelier). */
  shipping?: number;
}

const KEY = 'craftzaar-cart';

interface CartCtx {
  items: CartItem[];
  count: number;
  total: number;
  has: (id: string) => boolean;
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  removeMany: (ids: string[]) => void;
  ready: boolean;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // Load once on mount, then keep localStorage in sync (also across tabs).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter((i) => i && typeof i.id === 'string'));
      }
    } catch {
      /* corrupted storage → start empty */
    }
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      try {
        setItems(e.newValue ? JSON.parse(e.newValue) : []);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode — the in-memory cart still works */
    }
  }, []);

  const add = useCallback(
    (item: CartItem) => persist(items.some((i) => i.id === item.id) ? items : [...items, item]),
    [items, persist],
  );
  const remove = useCallback((id: string) => persist(items.filter((i) => i.id !== id)), [items, persist]);
  const removeMany = useCallback(
    (ids: string[]) => persist(items.filter((i) => !ids.includes(i.id))),
    [items, persist],
  );
  const clear = useCallback(() => persist([]), [persist]);
  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: items.length,
      total: items.reduce((s, i) => s + i.price, 0),
      has,
      add,
      remove,
      removeMany,
      clear,
      ready,
    }),
    [items, has, add, remove, removeMany, clear, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
