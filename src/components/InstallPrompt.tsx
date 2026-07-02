'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

// The browser fires `beforeinstallprompt` only on installable PWAs in Chromium
// (Android Chrome / Edge) — iOS Safari never fires it — so this banner is
// effectively Android-only, as requested. We stash the event and trigger the
// native install dialog from our own button.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'craftzaar-install-dismissed';

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Already installed (running standalone) or previously dismissed → skip.
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {}
    const handler = (e: Event) => {
      e.preventDefault(); // stop Chrome's default mini-infobar; we show our own
      setEvt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    const installed = () => setShow(false);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice.catch(() => {});
    setShow(false);
    setEvt(null);
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
    setShow(false);
  };

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-36 lg:bottom-20 z-[61] px-3">
      <div className="mx-auto max-w-md rounded-2xl border-[1.5px] border-line-strong bg-surface/95 backdrop-blur-md shadow-[4px_4px_0_0_var(--press-soft)] p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-clay grid place-items-center shrink-0">
          <Download className="w-5 h-5 text-paper" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink">Instalează Craft&apos;zaar</p>
          <p className="text-xs text-ink-soft leading-snug">Adaug-o pe ecranul principal pentru acces rapid.</p>
        </div>
        <button
          onClick={install}
          className="rounded-full bg-clay text-paper px-3.5 py-2 text-sm font-medium hover:bg-clay-deep transition-colors shrink-0"
        >
          Instalează
        </button>
        <button onClick={dismiss} aria-label="Închide" className="text-ink-faint hover:text-ink shrink-0 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
