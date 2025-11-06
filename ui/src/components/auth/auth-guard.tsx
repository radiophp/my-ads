'use client';

import { useEffect, type PropsWithChildren, type JSX } from 'react';
import { useRouter } from 'next/navigation';

import { useAppSelector } from '@/lib/hooks';

type AuthGuardProps = PropsWithChildren<{
  fallback?: JSX.Element | null;
}>;

export function AuthGuard({ children, fallback = null }: AuthGuardProps): JSX.Element | null {
  const auth = useAppSelector((state) => state.auth);
  const router = useRouter();
  const isAuthenticated = Boolean(auth.accessToken);

  useEffect(() => {
    if (auth.hydrated && !isAuthenticated) {
      router.replace('/');
    }
  }, [auth.hydrated, isAuthenticated, router]);

  if (!auth.hydrated) {
    return fallback;
  }

  if (!isAuthenticated) {
    return fallback;
  }

  return <>{children}</>;
}
