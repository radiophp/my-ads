'use client';

import { useTranslations } from 'next-intl';

export default function OfflinePage() {
  const t = useTranslations('offline');

  return (
    <main className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold">{t('title')}</h1>
      <p className="text-muted-foreground">{t('description')}</p>
    </main>
  );
}
