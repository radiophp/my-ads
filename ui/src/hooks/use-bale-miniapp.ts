'use client';

import { useCallback, useEffect, useState } from 'react';

function getRawHashParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const prefix = `${name}=`;
  const start = hash.indexOf(prefix);
  if (start === -1) return null;
  const valueStart = start + prefix.length;
  const end = hash.indexOf('&', valueStart);
  return end === -1 ? hash.slice(valueStart) : hash.slice(valueStart, end);
}

export type ContactRequestStatus = 'idle' | 'requesting' | 'sent' | 'cancelled' | 'unavailable';

export function useBaleMiniApp() {
  const [initData] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return getRawHashParam('tgWebAppData') ?? null;
  });
  const [contactStatus, setContactStatus] = useState<ContactRequestStatus>('idle');
  const [phone, setPhone] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    const fullSdk = window.Bale?.WebApp;
    if (fullSdk && typeof fullSdk.requestContact === 'function') {
      setSdkReady(true);
      return;
    }

    const interval = setInterval(() => {
      const sdk = window.Bale?.WebApp;
      if (sdk && typeof sdk.requestContact === 'function') {
        setSdkReady(true);
        clearInterval(interval);
        clearTimeout(timeout);
      }
    }, 200);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setSdkReady(true);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const requestContact = useCallback(() => {
    const sdk = window.Bale?.WebApp;

    if (sdk && typeof sdk.requestContact === 'function') {
      setContactStatus('requesting');
      sdk.requestContact((success: boolean, phoneNumber?: string) => {
        if (success && phoneNumber) {
          setPhone(phoneNumber);
        }
        setContactStatus(success ? 'sent' : 'cancelled');
      });
      return;
    }

    const stub = window.BaleWebApp;
    if (stub && typeof stub.postEvent === 'function') {
      setContactStatus('requesting');
      try {
        stub.postEvent('web_app_request_phone', '{}');
        setTimeout(() => { setContactStatus('sent'); }, 1000);
      } catch {
        setContactStatus('unavailable');
      }
      return;
    }

    setContactStatus('unavailable');
  }, []);

  const resetContactStatus = useCallback(() => {
    setContactStatus('idle');
    setPhone(null);
  }, []);

  return { initData, phone, sdkReady, contactStatus, requestContact, resetContactStatus } as const;
}
