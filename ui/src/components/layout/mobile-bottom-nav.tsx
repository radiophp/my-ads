'use client';

import { useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

import { LayoutDashboard, Bell, LogIn, Menu } from 'lucide-react';

import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

type MobileBottomNavProps = {
  pathname: string;
  isAuthenticated: boolean;
  homeLabel: string;
  dashboardLabel: string;
  notificationsLabel: string;
  loginLabel: string;
  otherLabel: string;
  onOpenMenu: () => void;
  hasRecentNotifications: boolean;
};

export function MobileBottomNav({
  pathname,
  isAuthenticated,
  homeLabel,
  dashboardLabel,
  notificationsLabel,
  loginLabel,
  otherLabel,
  onOpenMenu,
  hasRecentNotifications,
}: MobileBottomNavProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setPortalRoot(document.body);
  }, []);

  const isHome = pathname === '/';
  const isNotifications = pathname.startsWith('/dashboard/notifications');
  const isDashboard = pathname.startsWith('/dashboard') && !isNotifications;
  const isLogin = pathname.startsWith('/login');
  const itemClass = (active: boolean) =>
    cn(
      'flex flex-col items-center justify-center gap-1 p-2 text-[11px] font-medium transition-colors',
      active ? 'text-foreground' : 'text-muted-foreground',
    );
  const iconClass = (active: boolean) =>
    cn('size-5 transition-colors', active ? 'text-foreground' : 'text-muted-foreground');

  const nav = (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/40 bg-background/75 backdrop-blur-xl backdrop-saturate-150 sm:hidden">
      <div
        className={cn(
          'grid h-16 items-center px-4 pb-[env(safe-area-inset-bottom)]',
          isAuthenticated ? 'grid-cols-4' : 'grid-cols-3',
        )}
      >
        <Link href="/" className={itemClass(isHome)} aria-current={isHome ? 'page' : undefined}>
          <Image
            src="/fav/favicon-32x32.png"
            alt={homeLabel}
            width={20}
            height={20}
            className={cn('size-5', isHome ? 'opacity-100' : 'opacity-70')}
            priority={false}
          />
          <span>{homeLabel}</span>
        </Link>
        {isAuthenticated ? (
          <>
            <Link
              href="/dashboard"
              className={itemClass(isDashboard)}
              aria-current={isDashboard ? 'page' : undefined}
            >
              <LayoutDashboard className={iconClass(isDashboard)} aria-hidden />
              <span>{dashboardLabel}</span>
            </Link>
            <Link
              href="/dashboard/notifications"
              className={itemClass(isNotifications)}
              aria-current={isNotifications ? 'page' : undefined}
            >
              <span className="relative inline-flex items-center justify-center">
                <Bell className={iconClass(isNotifications)} aria-hidden />
                {hasRecentNotifications && (
                  <span
                    className="absolute -right-1 -top-1 size-2 rounded-full bg-destructive shadow"
                    aria-hidden
                  />
                )}
              </span>
              <span>{notificationsLabel}</span>
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className={itemClass(isLogin)}
            aria-current={isLogin ? 'page' : undefined}
          >
            <LogIn className={iconClass(isLogin)} aria-hidden />
            <span>{loginLabel}</span>
          </Link>
        )}
        <button
          type="button"
          onClick={onOpenMenu}
          className={itemClass(false)}
          aria-label={otherLabel}
        >
          <Menu className={iconClass(false)} aria-hidden />
          <span>{otherLabel}</span>
        </button>
      </div>
    </nav>
  );

  if (portalRoot) {
    return createPortal(nav, portalRoot);
  }

  return nav;
}
