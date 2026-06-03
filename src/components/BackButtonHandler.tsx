'use client';

import { useEffect } from 'react';

/**
 * On native Android, make the hardware / gesture Back button navigate the
 * in-app history (previous screen) instead of exiting the app. The app only
 * closes when there's nowhere left to go back to. No-op on web/PWA.
 */
export function BackButtonHandler() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import('@capacitor/app');
        const sub = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack || window.history.length > 1) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
        cleanup = () => sub.remove();
      } catch {
        /* not running inside Capacitor */
      }
    })();
    return () => cleanup?.();
  }, []);

  return null;
}
