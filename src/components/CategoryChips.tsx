'use client';

import { useSlidingIndicator } from '@/lib/use-sliding-indicator';

export interface ChipOption {
  key: string;
  label: string;
}

/**
 * Horizontally-scrollable category chips with a single "liquid glass" pill that
 * slides + stretches to the active chip (the same indicator used in the desktop
 * nav and the phone bottom bar). Chips are transparent so the pill is visible
 * sliding behind them.
 */
export function CategoryChips({
  options,
  active,
  onChange,
  className,
}: {
  options: ChipOption[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  const { containerRef, register, pill } = useSlidingIndicator<HTMLDivElement>(active);

  return (
    <div className={`overflow-x-auto no-scrollbar ${className ?? ''}`}>
      <div ref={containerRef} className="relative flex gap-2 min-w-max">
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-clay/12 dark:bg-clay/25 ring-1 ring-clay/25 backdrop-blur-sm shadow-[0_2px_12px_-4px_rgba(185,87,47,0.4)]"
          style={{
            left: pill.left,
            top: pill.top,
            width: pill.width,
            height: pill.height,
            opacity: pill.ready ? 1 : 0,
            transition: pill.animate
              ? 'left .5s cubic-bezier(.22,1,.36,1), width .5s cubic-bezier(.22,1,.36,1), top .5s ease, height .5s ease, opacity .3s ease'
              : 'opacity .3s ease',
          }}
        />
        {options.map((o) => {
          const isActive = o.key === active;
          return (
            <button
              key={o.key}
              ref={register(o.key)}
              onClick={() => onChange(o.key)}
              aria-pressed={isActive}
              className={`relative z-10 inline-flex items-center px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border-[1.5px] transition-colors duration-300 ${
                isActive
                  ? 'text-clay border-clay/45'
                  : 'text-ink-soft border-line hover:text-ink hover:border-line-strong'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
