'use client';

import { useEffect } from 'react';

const SW_PATH = '/service-worker.js';

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

    const register = async () => {
      try {
        const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
        if (existing) {
          return;
        }
        await navigator.serviceWorker.register(SW_PATH);
      } catch (error) {
        // eslint-disable-next-line no-console
        if (!cancelled) console.warn('Service worker registration failed', error);
      }
    };

    void register();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
