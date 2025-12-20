'use client';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { UserMenu } from '@/components/layout/user-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { usePwaPrompt } from '@/hooks/usePwaPrompt';
import { Link } from '@/i18n/routing';
import { useLogoutMutation } from '@/features/api/apiSlice';
import { clearAuth } from '@/features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { Menu, X, DownloadCloud, LogOut } from 'lucide-react';
import { useNotificationsSocket } from '@/features/notifications/useNotificationsSocket';
import { CodeSearch } from '@/components/layout/code-search';

type NavIconKey = 'dashboard' | 'ringBinder' | 'savedFilters' | 'notifications' | 'admin';

type NavItemConfig = {
  key: string;
  label: string;
  href: string;
  visible: boolean;
  icon: NavIconKey;
};

export function SiteHeader() {
  const t = useTranslations();
  const pwaT = useTranslations('pwa');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();
  const { isInstallable, promptInstall, isStandalone, hasRelatedInstall } = usePwaPrompt();
  const [isPromptingInstall, setIsPromptingInstall] = useState(false);
  const [showManualInstall, setShowManualInstall] = useState(false);
  const [showInstalledNotice, setShowInstalledNotice] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useNotificationsSocket();

  const isAuthenticated = Boolean(auth.accessToken);
  const hasExistingInstall = isStandalone || hasRelatedInstall;
  const showInstallButton = !isStandalone;

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

  const handleInstallClick = async () => {
    if (isPromptingInstall) {
      return;
    }
    if (hasExistingInstall) {
      setShowInstalledNotice(true);
      return;
    }
    if (!isInstallable) {
      setShowManualInstall(true);
      return;
    }
    try {
      setIsPromptingInstall(true);
      const accepted = await promptInstall();
      toast({
        title: accepted ? pwaT('installedTitle') : pwaT('installTitle'),
        description: accepted ? pwaT('installedDescription') : pwaT('installDescription'),
      });
    } catch (error) {
      console.error('Failed to trigger PWA install', error);
      setShowManualInstall(true);
    } finally {
      setIsPromptingInstall(false);
    }
  };

  const availableNavItems: NavItemConfig[] = [
    {
      key: 'dashboard',
      label: t('header.nav.dashboard'),
      href: '/dashboard',
      visible: isAuthenticated,
      icon: 'dashboard' as const,
    },
    {
      key: 'ring-binder',
      label: t('header.nav.ringBinder'),
      href: '/dashboard/ring-binder',
      visible: isAuthenticated,
      icon: 'ringBinder' as const,
    },
    {
      key: 'saved-filters',
      label: t('header.nav.savedFilters'),
      href: '/dashboard/saved-filters',
      visible: isAuthenticated,
      icon: 'savedFilters' as const,
    },
    {
      key: 'notifications',
      label: t('header.nav.notifications'),
      href: '/dashboard/notifications',
      visible: isAuthenticated,
      icon: 'notifications' as const,
    },
    {
      key: 'admin',
      label: t('header.nav.admin'),
      href: '/admin',
      visible: isAuthenticated && auth.user?.role === 'ADMIN',
      icon: 'admin' as const,
    },
  ];

  const userDisplayName = useMemo(() => {
    if (!auth.user) {
      return null;
    }
    const firstName = auth.user.firstName?.trim();
    if (firstName) {
      return firstName;
    }
    const lastName = auth.user.lastName?.trim();
    if (lastName) {
      return lastName;
    }
    return auth.user.phone;
  }, [auth.user]);
  const userAvatar = useMemo(() => {
    const url = auth.user?.profileImageUrl?.trim();
    return url && url.length > 0 ? url : null;
  }, [auth.user?.profileImageUrl]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur transition-colors">
      <div className="flex h-16 w-full items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-border/80 bg-card px-2.5 py-2 text-sm font-medium text-foreground transition hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={t('header.mobileMenuOpen')}
          >
            <Menu className="size-5" aria-hidden />
          </button>
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
          {isAuthenticated && (
            <Link
              href="/dashboard/ring-binder"
              className="hidden rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground sm:inline-flex"
            >
              {t('header.nav.ringBinder')}
            </Link>
          )}
          {isAuthenticated && (
            <Link
              href="/dashboard/saved-filters"
              className="hidden rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground sm:inline-flex"
            >
              {t('header.nav.savedFilters')}
            </Link>
          )}
          {isAuthenticated && (
            <Link
              href="/dashboard/notifications"
              className="hidden rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground sm:inline-flex"
            >
              {t('header.nav.notifications')}
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
        <div className="hidden items-center gap-2 sm:flex">
          {showInstallButton ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstallClick}
              disabled={isPromptingInstall}
            >
              {isPromptingInstall ? pwaT('installingLabel') : t('header.installApp')}
            </Button>
          ) : null}
          {isAuthenticated ? <CodeSearch /> : null}
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
      <MobileNavigationDrawer
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        navItems={availableNavItems}
        showInstallButton={showInstallButton}
        installLabel={isPromptingInstall ? pwaT('installingLabel') : t('header.installApp')}
        onInstallClick={handleInstallClick}
        isInstallLoading={isPromptingInstall}
        isAuthenticated={isAuthenticated}
        userName={userDisplayName}
        userAvatar={userAvatar}
        onLogout={handleLogout}
        logoutLabel={isLoggingOut ? t('header.loggingOut') : t('header.logout')}
        profileHref="/dashboard/profile"
        profileLabel={t('header.menu.profile')}
        menuTitle={t('header.mobileMenuTitle')}
        closeLabel={t('header.mobileMenuClose')}
        themeToggleLabel={t('header.themeToggle')}
      />
      <ManualInstallDialog open={showManualInstall} onOpenChange={setShowManualInstall} />
      <InstalledNoticeDialog
        open={showInstalledNotice}
        onOpenChange={setShowInstalledNotice}
        onOpenApp={() => {
          if (typeof window !== 'undefined') {
            window.open(window.location.origin, '_blank');
          }
        }}
      />
    </header>
  );
}

type ManualInstallDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ManualInstallDialog({ open, onOpenChange }: ManualInstallDialogProps) {
  const t = useTranslations('pwa.manualSteps');
  const heading = useTranslations('pwa');
  const platforms = [
    {
      key: 'android',
      steps: ['step1', 'step2', 'step3'],
    },
    {
      key: 'ios',
      steps: ['step1', 'step2', 'step3'],
    },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{heading('manualTitle')}</DialogTitle>
          <DialogDescription>{heading('manualDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {platforms.map((platform) => (
            <div key={platform.key} className="rounded-lg border border-border/60 p-4">
              <p className="text-sm font-semibold text-foreground">{t(`${platform.key}.title`)}</p>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                {platform.steps.map((step) => (
                  <li key={step}>{t(`${platform.key}.${step}`)}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type InstalledNoticeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenApp: () => void;
};

function InstalledNoticeDialog({ open, onOpenChange, onOpenApp }: InstalledNoticeDialogProps) {
  const t = useTranslations('pwa');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('alreadyInstalledTitle')}</DialogTitle>
          <DialogDescription>{t('alreadyInstalledDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button onClick={onOpenApp}>{t('openAppButton')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type MobileNavigationDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navItems: NavItemConfig[];
  showInstallButton: boolean;
  installLabel: string;
  onInstallClick: () => void;
  isInstallLoading: boolean;
  isAuthenticated: boolean;
  userName: string | null;
  userAvatar: string | null;
  onLogout: () => Promise<void> | void;
  logoutLabel: string;
  profileHref: string;
  profileLabel: string;
  menuTitle: string;
  closeLabel: string;
  themeToggleLabel: string;
};

function MobileNavigationDrawer({
  open,
  onOpenChange,
  navItems,
  showInstallButton,
  installLabel,
  onInstallClick,
  isInstallLoading,
  isAuthenticated,
  userName,
  userAvatar,
  onLogout,
  logoutLabel,
  profileHref,
  profileLabel,
  menuTitle,
  closeLabel,
  themeToggleLabel,
}: MobileNavigationDrawerProps) {
  const themeToggleRef = useRef<HTMLButtonElement>(null);
  const renderIcon = (icon: NavIconKey) => {
    switch (icon) {
      case 'dashboard':
        return (
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path d="M3 13h8V3H3zm10 8h8v-8h-8zM3 21h8v-6H3zm10-18v6h8V3z" fill="currentColor" />
          </svg>
        );
      case 'ringBinder':
        return (
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path
              d="M3 7h7l2 2h9v9a2 2 0 0 1-2 2H3V7Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path d="M7 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'savedFilters':
        return (
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path
              d="M5 5h14v14l-7-4-7 4z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path d="M9 9h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'notifications':
        return (
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path
              d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path
              d="M3 7h18M3 12h18M3 17h18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        );
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} disableBackClose>
      {/* eslint-disable tailwindcss/classnames-order */}
      <DialogContent
        hideCloseButton
        className="left-auto right-0 top-0 h-dvh w-72 max-w-[85vw] translate-x-full translate-y-0 rounded-none border-0 bg-background p-0 text-foreground transition-transform duration-300 data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full sm:hidden"
      >
        <DialogTitle className="sr-only">{menuTitle}</DialogTitle>
        <div className="flex h-full flex-col border-l border-border/60">
          <div className="flex items-center justify-between border-b border-border/60 p-4">
            <p className="text-base font-semibold">{menuTitle}</p>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              aria-label={closeLabel}
            >
              <X className="size-5" aria-hidden />
            </Button>
          </div>
          {isAuthenticated ? (
            <div className="border-b border-border/60 px-4 py-2">
              <Link
                href={profileHref}
                className="flex items-center gap-3 rounded-lg px-2 py-1 transition hover:bg-secondary/60"
                onClick={() => onOpenChange(false)}
              >
                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt={userName ?? profileLabel}
                    width={40}
                    height={40}
                    className="size-10 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-secondary/50 text-sm font-semibold text-foreground">
                    {(userName ?? profileLabel).slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-semibold text-foreground">
                  {userName ?? profileLabel}
                </span>
              </Link>
            </div>
          ) : null}
          <nav className="flex flex-col gap-2 p-4">
            {navItems.filter((item) => item.visible).map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-foreground transition hover:border-border/70 hover:bg-secondary/60"
                onClick={() => onOpenChange(false)}
              >
                {renderIcon(item.icon)}
                {item.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <div className="pt-2">
                <CodeSearch variant="mobile" onSuccess={() => onOpenChange(false)} />
              </div>
            ) : null}
          </nav>
          <div className="space-y-4 border-t border-border/60 p-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => themeToggleRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  themeToggleRef.current?.click();
                }
              }}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{themeToggleLabel}</span>
              <ThemeToggle ref={themeToggleRef} />
            </div>
            <div className="border-t border-border/60 pt-3">
            {showInstallButton ? (
              <Button
                className="w-full border-0 bg-primary/90 text-right text-primary-foreground hover:bg-primary"
                onClick={() => {
                  onOpenChange(false);
                  onInstallClick();
                }}
                disabled={isInstallLoading}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <DownloadCloud className="size-4" aria-hidden />
                  {installLabel}
                </span>
              </Button>
            ) : null}
            </div>
          </div>
          {isAuthenticated ? (
            <div className="mt-auto border-t border-border/60 p-4">
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={async () => {
                  onOpenChange(false);
                  await onLogout();
                }}
              >
                <span className="flex items-center justify-center gap-2 text-sm font-semibold">
                  <LogOut className="size-4" aria-hidden />
                  {logoutLabel}
                </span>
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
      {/* eslint-enable tailwindcss/classnames-order */}
    </Dialog>
  );
}
