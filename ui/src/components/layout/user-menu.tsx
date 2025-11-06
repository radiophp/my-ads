/* eslint-disable tailwindcss/classnames-order */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { LogOut, UserRound } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import type { AuthenticatedUser } from '@/types/auth';

type UserMenuProps = {
  user: AuthenticatedUser;
  onLogout: () => Promise<void> | void;
  isLoggingOut: boolean;
  logoutLabel: string;
  profileLabel: string;
  profileHref: string;
};

export function UserMenu({
  user,
  onLogout,
  isLoggingOut,
  logoutLabel,
  profileLabel,
  profileHref,
}: UserMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const profileImage = useMemo(() => {
    const url = user.profileImageUrl?.trim();
    return url && url.length > 0 ? url : null;
  }, [user.profileImageUrl]);

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
          'flex items-center gap-2 rounded-full border border-border/70 bg-secondary/70 px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors',
          'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={isLoggingOut}
      >
        <div className="flex items-center gap-2">
          <Avatar className="size-9">
            {profileImage ? (
              <AvatarImage src={profileImage} alt={displayName} />
            ) : (
              <AvatarFallback>
                <UserRound className="size-4" aria-hidden />
              </AvatarFallback>
            )}
          </Avatar>
          <span className="max-w-[160px] truncate">{displayName}</span>
        </div>
      </button>
      {open ? (
        <div
          ref={menuRef}
          role="menu"
          className={cn(
            'absolute z-50 right-0 mt-2 w-48 rounded-lg border border-border/70',
            'p-1 bg-popover/95 text-sm shadow-lg backdrop-blur',
          )}
        >
          <Link
            href={profileHref}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors',
              'hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <UserRound className="size-4" aria-hidden />
            <span>{profileLabel}</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors',
              'hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-70',
            )}
          >
            <LogOut className="size-4" aria-hidden />
            <span>{logoutLabel}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
/* eslint-enable tailwindcss/classnames-order */
