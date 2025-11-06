'use client';

import { useEffect, type PropsWithChildren, type JSX } from 'react';
import { useRouter } from 'next/navigation';

import { useAppSelector } from '@/lib/hooks';

type AdminGuardProps = PropsWithChildren<{
  fallback?: JSX.Element | null;
}>;

export function AdminGuard({ children, fallback = null }: AdminGuardProps): JSX.Element | null {
  const auth = useAppSelector((state) => state.auth);
  const router = useRouter();
  const isAuthenticated = Boolean(auth.accessToken);
  const isAdmin = auth.user?.role === 'ADMIN';

  useEffect(() => {
    if (!auth.hydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    if (!isAdmin) {
      router.replace('/dashboard');
    }
  }, [auth.hydrated, isAdmin, isAuthenticated, router]);

  if (!auth.hydrated) {
    return fallback;
  }

  if (!isAuthenticated || !isAdmin) {
    return fallback;
  }

  return <>{children}</>;
}
