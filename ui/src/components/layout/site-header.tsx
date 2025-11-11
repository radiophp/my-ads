'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur transition-colors">
      <div className="flex h-16 w-full items-center justify-between px-4">
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
