'use client';

import { useEffect, useLayoutEffect } from 'react';

import {
  AUTH_STORAGE_KEY,
  hydrateAuthFromStorage,
  hydrateAuthState,
} from '@/features/auth/authSlice';
import { useAppDispatch } from '@/lib/hooks';

export function AuthInitializer(): null {
  const dispatch = useAppDispatch();

  useLayoutEffect(() => {
    const storedState = hydrateAuthFromStorage();
    dispatch(hydrateAuthState(storedState));
  }, [dispatch]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) {
        return;
      }
      if (event.key && event.key !== AUTH_STORAGE_KEY) {
        return;
      }
      const storedState = hydrateAuthFromStorage();
      dispatch(hydrateAuthState(storedState));
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [dispatch]);

  return null;
}
