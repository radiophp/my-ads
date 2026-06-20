'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';

import {
  AUTH_STORAGE_KEY,
  hydrateAuthFromStorage,
  hydrateAuthState,
  setBaleMiniApp,
  clearPendingDeepLink,
} from '@/features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';

const BALE_MINIAPP_KEY = 'my-ads-bale-miniapp';

export function AuthInitializer(): null {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pendingDeepLink = useAppSelector((s) => s.auth.pendingDeepLink);

  useLayoutEffect(() => {
    const storedState = hydrateAuthFromStorage();
    dispatch(hydrateAuthState(storedState));
    const isMiniApp = localStorage.getItem(BALE_MINIAPP_KEY) === '1';
    dispatch(setBaleMiniApp(isMiniApp));
  }, [dispatch]);

  useEffect(() => {
    if (!pendingDeepLink) return;
    const postId = pendingDeepLink.startsWith('post_') ? pendingDeepLink.slice(5) : null;
    if (!postId) return;
    dispatch(clearPendingDeepLink());
    router.replace(`/dashboard/posts/${postId}`);
  }, [pendingDeepLink, dispatch, router]);

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
