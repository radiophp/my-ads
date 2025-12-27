'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const supportsHistory = (): boolean =>
  typeof window !== 'undefined' && typeof window.history?.pushState === 'function';

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  const displayMode = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const fullscreenMode = window.matchMedia?.('(display-mode: fullscreen)')?.matches;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return Boolean(displayMode || fullscreenMode || iosStandalone);
};

const getBaseState = (state: unknown): Record<string, unknown> => {
  if (state && typeof state === 'object') {
    return state as Record<string, unknown>;
  }
  return {};
};

const getSessionValue = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const setSessionValue = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
};

export function PwaBackNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString();
  const initialUrlRef = useRef<string | null>(null);
  const activeRef = useRef(false);
  const handlerRef = useRef<((event: PopStateEvent) => void) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (!initialUrlRef.current) {
      initialUrlRef.current = currentUrl;
    }

    const cleanup = () => {
      if (handlerRef.current) {
        window.removeEventListener('popstate', handlerRef.current);
        handlerRef.current = null;
      }
      activeRef.current = false;
    };

    if (activeRef.current) {
      if (currentUrl !== initialUrlRef.current) {
        cleanup();
      }
      return cleanup;
    }

    if (!supportsHistory() || !isStandalone()) {
      return cleanup;
    }

    if (currentUrl === '/' || initialUrlRef.current !== currentUrl) {
      return cleanup;
    }

    const trapKey = 'pwa:deep-link-trap';
    if (getSessionValue(trapKey) === currentUrl) {
      return cleanup;
    }

    const baseState = getBaseState(window.history.state);
    try {
      window.history.replaceState({ ...baseState, __deepLinkRoot: true }, '', window.location.href);
      window.history.pushState({ ...baseState, __deepLinkTrap: true }, '', window.location.href);
      setSessionValue(trapKey, currentUrl);
    } catch {
      return cleanup;
    }

    const handlePopState = () => {
      if (!activeRef.current) return;
      const initialUrl = initialUrlRef.current;
      const latestUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (initialUrl && latestUrl !== initialUrl) {
        cleanup();
        return;
      }
      cleanup();
      router.replace('/');
    };

    handlerRef.current = handlePopState;
    window.addEventListener('popstate', handlePopState);
    activeRef.current = true;

    return cleanup;
  }, [pathname, search, router]);

  return null;
}
