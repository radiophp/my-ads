'use client';

import { WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function OfflinePage() {
  const t = useTranslations('offline');

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 px-4 py-12">
      <section className="flex w-full max-w-lg flex-col items-center gap-6 rounded-3xl border bg-background px-8 py-10 text-center shadow-lg">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <WifiOff aria-hidden className="h-8 w-8" />
        </span>

        <div className="space-y-2">
          <p className="text-lg font-semibold uppercase tracking-[0.3em] text-primary">
            {t('label')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-base text-muted-foreground">{t('description')}</p>
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{t('hint')}</p>
          <p>{t('action')}</p>
        </div>
      </section>
    </main>
  );
}
