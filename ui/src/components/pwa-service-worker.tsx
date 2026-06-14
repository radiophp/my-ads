'use client';

import { useEffect } from 'react';
import { registerServiceWorker, unregisterServiceWorker } from '@/lib/service-worker';

const canRegisterSw = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isSecure = window.location.protocol === 'https:';
  return isSecure || isLocalhost;
};

export function PwaServiceWorker() {
  useEffect(() => {
    if (!canRegisterSw()) {
      return;
    }
    let cancelled = false;

    const init = async () => {
      await unregisterServiceWorker();

      if (!cancelled) {
        try {
          await registerServiceWorker();
        } catch (error) {
          if (!cancelled) console.warn('Service worker registration failed', error);
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
