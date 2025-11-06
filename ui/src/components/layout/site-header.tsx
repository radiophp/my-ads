'use client';

import type { JSX } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { UserMenu } from '@/components/layout/user-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { Link } from '@/i18n/routing';
import { useLogoutMutation } from '@/features/api/apiSlice';
import { clearAuth } from '@/features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';

export function SiteHeader(): JSX.Element {
  const t = useTranslations();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();

  const isAuthenticated = Boolean(auth.accessToken);

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch (error) {
      console.error('Failed to log out', error);
    } finally {
      dispatch(clearAuth());
      router.push('/');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur transition-colors">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold">
            {t('header.brand')}
          </Link>
          {isAuthenticated && (
            <Link
              href="/dashboard"
              className="hidden rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground sm:inline-flex"
            >
              {t('header.nav.dashboard')}
            </Link>
          )}
          {isAuthenticated && auth.user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="hidden rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground sm:inline-flex"
            >
              {t('header.nav.admin')}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated && auth.user ? (
            <UserMenu
              user={auth.user}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
              logoutLabel={isLoggingOut ? t('header.loggingOut') : t('header.logout')}
              profileLabel={t('header.menu.profile')}
              profileHref="/dashboard/profile"
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
