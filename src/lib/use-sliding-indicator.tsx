'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SlidingPill {
  left: number;
  top: number;
  width: number;
  height: number;
  ready: boolean;
  /** True only when sliding between two items — first placement, reappearance,
   *  resizes and font reflows position instantly (no fly-in from 0,0). */
  animate: boolean;
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
  const prevKeyRef = useRef<string | number | null>(null);
  const [pill, setPill] = useState<SlidingPill>({ left: 0, top: 0, width: 0, height: 0, ready: false, animate: false });

  const register = useCallback(
    (key: string | number) => (el: HTMLElement | null) => {
      itemRefs.current.set(key, el);
    },
    [],
  );

  useEffect(() => {
    // Only an actual item→item change earns the slide; everything else
    // (initial mount, resize, font swap) must place the pill instantly,
    // otherwise it visibly flies in from 0,0 on first paint.
    const isKeyChange =
      prevKeyRef.current !== null && activeKey !== null && prevKeyRef.current !== activeKey;
    prevKeyRef.current = activeKey;

    const measure = (animate: boolean) => {
      const container = containerRef.current;
      const el = activeKey != null ? itemRefs.current.get(activeKey) : null;
      if (!container || !el || el.offsetWidth === 0) {
        setPill((p) => (p.ready ? { ...p, ready: false } : p));
        return;
      }
      const cb = container.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      // Offsets are relative to the (scrolling) container content, so the pill
      // stays aligned even when the row is scrolled horizontally. A hidden pill
      // never slides — it snaps to the new item and fades back in. Unchanged
      // boxes return the same state so a static re-measure (font-ready fires
      // right after every key change) can't cancel an in-flight slide.
      setPill((p) => {
        const left = b.left - cb.left;
        const top = b.top - cb.top;
        if (p.ready && p.left === left && p.top === top && p.width === b.width && p.height === b.height) {
          return p;
        }
        return { left, top, width: b.width, height: b.height, ready: true, animate: animate && p.ready };
      });
    };

    const measureAnimated = () => measure(isKeyChange);
    const measureStatic = () => measure(false);

    measureAnimated();
    const raf = requestAnimationFrame(measureAnimated); // after layout settles
    window.addEventListener('resize', measureStatic);

    let ro: ResizeObserver | undefined;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measureStatic);
      ro.observe(containerRef.current);
    }
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(measureStatic).catch(() => {});
    }

    // Bring the active item into view in a scrollable row (no-op otherwise);
    // instant on first mount, smooth when actually switching items.
    const active = activeKey != null ? itemRefs.current.get(activeKey) : null;
    active?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: isKeyChange ? 'smooth' : 'auto' });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measureStatic);
      ro?.disconnect();
    };
  }, [activeKey]);

  return { containerRef, register, pill };
}
