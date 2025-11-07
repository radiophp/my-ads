'use client';

import { useTranslations } from 'next-intl';

import { DashboardSearchFilterPanel } from '@/components/dashboard/search-filter-panel';

export function DashboardPlaceholder() {
  const t = useTranslations('dashboard');

  return (
    <main className="flex w-full flex-col gap-6 px-4 py-20 sm:px-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h1>
          <p className="mt-2 text-base text-muted-foreground sm:text-lg">{t('subtitle')}</p>
        </div>

        <DashboardSearchFilterPanel />
      </div>
    </main>
  );
}
