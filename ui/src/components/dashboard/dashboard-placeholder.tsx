'use client';

import type { JSX } from 'react';
import { useTranslations } from 'next-intl';

export function DashboardPlaceholder(): JSX.Element {
  const t = useTranslations('dashboard');

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h1>
      <p className="text-base text-muted-foreground sm:text-lg">{t('subtitle')}</p>
    </main>
  );
}
