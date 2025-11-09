'use client';

import { useLayoutEffect } from 'react';

import { hydrateAuthFromStorage, hydrateAuthState } from '@/features/auth/authSlice';
import { useAppDispatch } from '@/lib/hooks';

export function AuthInitializer(): null {
  const dispatch = useAppDispatch();

  useLayoutEffect(() => {
    const storedState = hydrateAuthFromStorage();
    dispatch(hydrateAuthState(storedState));
  }, [dispatch]);

  return null;
}
