'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const KEY = 'craftzaar-cookie-consent';
type Choice = 'accepted' | 'rejected';

/**
 * Cookie consent banner + analytics gate. The site's own cookies are strictly
 * necessary; Vercel Analytics / Speed Insights are anonymous + cookieless but we
 * still load them only after an explicit "Accept" so users get a real choice
 * (GDPR/ePrivacy posture). Choice persists in localStorage.
 */
export function CookieConsent() {
  const [choice, setChoice] = useState<Choice | 'loading' | null>('loading');

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      setChoice(v === 'accepted' || v === 'rejected' ? (v as Choice) : null);
    } catch {
      setChoice(null);
    }
  }, []);

  const decide = (c: Choice) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {}
    setChoice(c);
    // Tell the other floating widgets (Help, Install) the banner is gone —
    // they hold back until consent is decided so nothing overlaps it.
    window.dispatchEvent(new Event('cz-consent-set'));
  };

  return (
    <>
      {choice === 'accepted' && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}

      {choice === null && (
        <div className="fixed inset-x-0 bottom-20 lg:bottom-4 z-[60] px-3">
          <div className="mx-auto max-w-2xl rounded-2xl border-[1.5px] border-line-strong bg-surface/95 backdrop-blur-md shadow-[4px_4px_0_0_var(--press-soft)] p-4 sm:flex sm:items-center sm:gap-4">
            <p className="text-sm text-ink-soft flex-1 mb-3 sm:mb-0">
              Folosim cookie-uri necesare funcționării site-ului și, cu acordul tău, statistici anonime de trafic. Detalii în{' '}
              <Link href="/cookies" className="text-clay underline underline-offset-2">
                Politica de Cookie-uri
              </Link>
              .
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => decide('rejected')}
                className="rounded-full border border-line-strong px-4 py-2 text-sm text-ink-soft hover:text-ink transition-colors"
              >
                Doar necesare
              </button>
              <button
                onClick={() => decide('accepted')}
                className="rounded-full bg-clay text-paper px-4 py-2 text-sm font-medium hover:bg-clay-deep transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
