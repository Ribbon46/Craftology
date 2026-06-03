'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SlidingPill {
  left: number;
  top: number;
  width: number;
  height: number;
  ready: boolean;
}

/**
 * Measures the active item inside a container and returns its box, so a single
 * absolutely-positioned "liquid glass" pill can slide/stretch between items.
 * Re-measures on resize, container resize, and web-font swap; smoothly scrolls
 * the active item into view (useful for horizontally-scrollable chip rows).
 *
 * Usage: attach `containerRef` to a `position: relative` wrapper, `register(key)`
 * to each item, pass the active key, and style a `<span>` from `pill`.
 */
export function useSlidingIndicator<C extends HTMLElement = HTMLDivElement>(
  activeKey: string | number | null,
) {
  const containerRef = useRef<C>(null);
  const itemRefs = useRef(new Map<string | number, HTMLElement | null>());
  const [pill, setPill] = useState<SlidingPill>({ left: 0, top: 0, width: 0, height: 0, ready: false });

  const register = useCallback(
    (key: string | number) => (el: HTMLElement | null) => {
      itemRefs.current.set(key, el);
    },
    [],
  );

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const el = activeKey != null ? itemRefs.current.get(activeKey) : null;
      if (!container || !el || el.offsetWidth === 0) {
        setPill((p) => (p.ready ? { ...p, ready: false } : p));
        return;
      }
      const cb = container.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      // Offsets are relative to the (scrolling) container content, so the pill
      // stays aligned even when the row is scrolled horizontally.
      setPill({ left: b.left - cb.left, top: b.top - cb.top, width: b.width, height: b.height, ready: true });
    };

    measure();
    const raf = requestAnimationFrame(measure); // after layout settles
    window.addEventListener('resize', measure);

    let ro: ResizeObserver | undefined;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(containerRef.current);
    }
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(measure).catch(() => {});
    }

    // Bring the active item into view in a scrollable row (no-op otherwise).
    const active = activeKey != null ? itemRefs.current.get(activeKey) : null;
    active?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [activeKey]);

  return { containerRef, register, pill };
}
