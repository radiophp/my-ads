'use client';

import * as React from 'react';

export function usePwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [hasRelatedInstall, setHasRelatedInstall] = React.useState(false);

  React.useEffect(() => {
    const existingPrompt = (window as Window & { __pwaPromptEvent?: BeforeInstallPromptEvent | null })
      .__pwaPromptEvent;
    if (existingPrompt) {
      setDeferredPrompt(existingPrompt);
      setIsInstallable(true);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    const installableHandler = () => {
      const storedPrompt = (
        window as Window & { __pwaPromptEvent?: BeforeInstallPromptEvent | null }
      ).__pwaPromptEvent;
      if (storedPrompt) {
        setDeferredPrompt(storedPrompt);
        setIsInstallable(true);
      }
    };
    const installedHandler = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
    };
    window.addEventListener('pwa:installable', installableHandler as EventListener);
    window.addEventListener('pwa:installed', installedHandler as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('pwa:installable', installableHandler as EventListener);
      window.removeEventListener('pwa:installed', installedHandler as EventListener);
    };
  }, []);

  React.useEffect(() => {
    const updateStandalone = () => {
      if (typeof window === 'undefined') {
        return;
      }
      const mediaQuery = window.matchMedia('(display-mode: standalone)');
      const isStandaloneMode =
        mediaQuery.matches ||
        ((window.navigator as Navigator & { standalone?: boolean }).standalone ?? false);
      setIsStandalone(isStandaloneMode);
    };

    if (typeof window === 'undefined') {
      return;
    }

    updateStandalone();
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const listener = (event: MediaQueryListEvent) => setIsStandalone(event.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
    } else {
      mediaQuery.addListener(listener);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', listener);
      } else {
        mediaQuery.removeListener(listener);
      }
    };
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    const detectRelatedApps = async () => {
      if (typeof window === 'undefined') {
        return;
      }
      const navigatorWithApi = window.navigator as Navigator & {
        getInstalledRelatedApps?: () => Promise<Array<Record<string, unknown>>>;
      };
      if (typeof navigatorWithApi.getInstalledRelatedApps !== 'function') {
        return;
      }
      try {
        const relatedApps = await navigatorWithApi.getInstalledRelatedApps();
        if (isMounted) {
          setHasRelatedInstall(Array.isArray(relatedApps) && relatedApps.length > 0);
        }
      } catch {
        // ignore
      }
    };

    void detectRelatedApps();

    return () => {
      isMounted = false;
    };
  }, []);

  const promptInstall = React.useCallback(async () => {
    const storedPrompt =
      deferredPrompt ??
      (window as Window & { __pwaPromptEvent?: BeforeInstallPromptEvent | null }).__pwaPromptEvent ??
      null;
    if (!storedPrompt) return false;
    storedPrompt.prompt();
    const { outcome } = await storedPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    (
      window as Window & { __pwaPromptEvent?: BeforeInstallPromptEvent | null }
    ).__pwaPromptEvent = null;
    return outcome === 'accepted';
  }, [deferredPrompt]);

  return { isInstallable, promptInstall, isStandalone, hasRelatedInstall } as const;
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};
