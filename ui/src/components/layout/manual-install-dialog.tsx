'use client';

import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ManualInstallDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ManualInstallDialog({ open, onOpenChange }: ManualInstallDialogProps) {
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
