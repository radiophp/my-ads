'use client';

import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type InstalledNoticeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenApp: () => void;
};

export function InstalledNoticeDialog({ open, onOpenChange, onOpenApp }: InstalledNoticeDialogProps) {
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
