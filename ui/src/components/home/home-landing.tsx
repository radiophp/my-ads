'use client';

import { useTranslations } from 'next-intl';

export function HomeLanding() {
  const t = useTranslations('landing');

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-24">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t('title')}</h1>
      <p className="text-lg text-muted-foreground sm:text-xl">{t('subtitle')}</p>
    </main>
  );
}

