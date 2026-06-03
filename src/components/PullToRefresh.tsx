'use client';

import { useRef, useState, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 72; // px of (resisted) pull needed to trigger a refresh
const MAX = 120; // clamp so it can't be dragged absurdly far
const RESIST = 0.5; // drag feels rubber-banded, not 1:1

function atTop() {
  return (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
}

/**
 * Chrome-mobile-style pull-to-refresh. Engages only when the page is scrolled
 * to the very top and the user drags downward (touch only — inert with a mouse,
 * so it never fires on desktop). A growing strip pushes the content down and
 * reveals a spinner; releasing past the threshold awaits `onRefresh`.
 *
 * The browser's own pull-to-refresh is suppressed via `overscroll-behavior-y`
 * on <body> (globals.css) so this gesture owns the interaction.
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
}: {
  onRefresh: () => Promise<unknown> | unknown;
  children: ReactNode;
  className?: string;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const tracking = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing || !atTop()) {
      tracking.current = false;
      return;
    }
    tracking.current = true;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!tracking.current || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0 || !atTop()) {
      if (pull !== 0) setPull(0);
      if (dragging) setDragging(false);
      tracking.current = atTop() && dy > 0;
      return;
    }
    if (!dragging) setDragging(true);
    setPull(Math.min(MAX, dy * RESIST));
  };

  const onTouchEnd = async () => {
    if (!tracking.current) return;
    tracking.current = false;
    setDragging(false);
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD); // hold the spinner open while refreshing
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const offset = refreshing ? THRESHOLD : pull;
  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      className={className}
    >
      <div
        aria-hidden
        className="pointer-events-none flex items-end justify-center overflow-hidden"
        style={{
          height: offset,
          opacity: offset > 3 ? 1 : 0,
          transition: dragging ? 'none' : 'height .3s cubic-bezier(.2,.7,.2,1), opacity .2s',
        }}
      >
        <span
          className="mb-2 grid place-items-center w-9 h-9 rounded-full bg-surface border border-line shadow-atelier text-clay"
          style={{ transform: `scale(${0.55 + progress * 0.45})` }}
        >
          <RefreshCw
            className={`w-[18px] h-[18px] ${refreshing ? 'animate-spin' : ''}`}
            style={refreshing ? undefined : { transform: `rotate(${progress * 280}deg)` }}
          />
        </span>
      </div>
      {children}
    </div>
  );
}
