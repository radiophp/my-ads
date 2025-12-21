'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePwaPrompt } from '@/hooks/usePwaPrompt';

export function PwaInstallPrompt() {
  const { isInstallable, promptInstall } = usePwaPrompt();
  const t = useTranslations('pwa');
  const [open, setOpen] = useState(false);
  const STORAGE_KEY = 'pwa-install-last-shown';
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

  const markShown = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  useEffect(() => {
    if (!isInstallable) return;
    if (typeof window === 'undefined') return;
    const lastShownRaw = localStorage.getItem(STORAGE_KEY);
    const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;
    const now = Date.now();
    if (!lastShown || now - lastShown > TWO_DAYS_MS) {
      setOpen(true);
      markShown();
    }
  }, [isInstallable, TWO_DAYS_MS]);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setOpen(false);
      markShown();
    }
  };

  return (
    <Dialog
      open={open && isInstallable}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) {
          markShown();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('installTitle')}</DialogTitle>
          <DialogDescription>{t('installDescription')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-3">
          <Button variant="outline" className="h-11 px-5" onClick={() => setOpen(false)}>
            {t('dismissButton')}
          </Button>
          <Button className="h-11 px-5" onClick={handleInstall}>
            {t('installButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
