/* eslint-disable tailwindcss/classnames-order */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Bell, BellOff, LogOut, Settings, UserRound } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import type { AuthenticatedUser } from '@/types/auth';
import { ThemeToggle } from '@/components/theme-toggle';

type UserMenuProps = {
  user: AuthenticatedUser;
  onLogout: () => Promise<void> | void;
  isLoggingOut: boolean;
  logoutLabel: string;
  profileLabel: string;
  profileHref: string;
  isAdmin: boolean;
  adminLabel: string;
  adminHref: string;
  notificationsEnabled: boolean;
  notificationBusy: boolean;
  notificationLabel: string;
  notificationButtonClass: string;
  onToggleNotifications: () => void;
};

export function UserMenu({
  user,
  onLogout,
  isLoggingOut,
  logoutLabel,
  profileLabel,
  profileHref,
  isAdmin,
  adminLabel,
  adminHref,
  notificationsEnabled,
  notificationBusy,
  notificationLabel,
  notificationButtonClass,
  onToggleNotifications,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isRtl = useLocale() === 'fa';

  const profileImage = useMemo(() => {
    const url = user.profileImageUrl?.trim();
    return url && url.length > 0 ? url : null;
  }, [user.profileImageUrl]);

  useEffect(() => {
    setAvatarError(false);
  }, [profileImage]);

  const displayName = useMemo(() => {
    const firstName = user.firstName?.trim();
    if (firstName && firstName.length > 0) {
      return firstName;
    }
    const lastName = user.lastName?.trim();
    if (lastName && lastName.length > 0) {
      return lastName;
    }
    return user.phone;
  }, [user.firstName, user.lastName, user.phone]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        target &&
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback(async () => {
    setOpen(false);
    await onLogout();
  }, [onLogout]);

  return (
    <div className="relative hidden sm:block">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex items-center rounded-full border border-border/70 bg-secondary/70 p-1.5 text-sm font-medium text-foreground transition-colors',
          'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={isLoggingOut}
      >
        <Avatar className="size-9">
          {profileImage && !avatarError ? (
            <AvatarImage src={profileImage} alt={displayName} onError={() => setAvatarError(true)} />
          ) : (
            <AvatarFallback>
              <UserRound className="size-4" aria-hidden />
            </AvatarFallback>
          )}
        </Avatar>
      </button>
      {open ? (
        <div
          ref={menuRef}
          role="menu"
          className={cn(
            'absolute z-50 mt-2 w-48 border border-border/70',
            isRtl ? 'left-0' : 'right-0',
            'p-2 bg-background text-sm shadow-lg backdrop-blur',
          )}
        >
          <Link
            href={profileHref}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
              'hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <UserRound className="size-4" aria-hidden />
            <span>{profileLabel}</span>
          </Link>
          {isAdmin ? (
            <Link
              href={adminHref}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 pl-9 text-left text-sm text-muted-foreground transition-colors',
                'hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              )}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Settings className="size-4" aria-hidden />
              <span>{adminLabel}</span>
            </Link>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
              'hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-70',
            )}
          >
            <LogOut className="size-4" aria-hidden />
            <span>{logoutLabel}</span>
          </button>
          <div className="flex items-center justify-end gap-2 px-3 py-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={notificationButtonClass}
              onClick={() => void onToggleNotifications()}
              aria-label={notificationLabel}
              title={notificationLabel}
              disabled={notificationBusy}
            >
              {notificationsEnabled ? (
                <Bell className="size-4" aria-hidden />
              ) : (
                <BellOff className="size-4" aria-hidden />
              )}
            </Button>
            <ThemeToggle className="size-9" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
/* eslint-enable tailwindcss/classnames-order */
