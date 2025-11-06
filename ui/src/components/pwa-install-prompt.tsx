'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { usePwaPrompt } from '@/hooks/usePwaPrompt';

export function PwaInstallPrompt() {
  const { isInstallable, promptInstall } = usePwaPrompt();
  const t = useTranslations('pwa');

  useEffect(() => {
    if (!isInstallable) return;
    const { id } = toast({
      id: 'pwa-install',
      title: t('installTitle'),
      description: t('installDescription'),
      action: (
        <Button
          onClick={async () => {
            const accepted = await promptInstall();
            if (accepted) {
              toast({
                id: 'pwa-installed',
                title: t('installedTitle'),
                description: t('installedDescription'),
              });
            }
          }}
        >
          {t('installButton')}
        </Button>
      ),
    });

    return () => toast.dismiss(id);
  }, [isInstallable, promptInstall, t]);

  return null;
}
