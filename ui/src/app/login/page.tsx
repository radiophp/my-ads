import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

import { HomeAuthPanel } from '@/components/home/home-auth-panel';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing.login');
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LoginPage() {
  const t = await getTranslations('landing');
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="w-full max-w-md lg:justify-self-start">
          <HomeAuthPanel />
        </div>
        <section className="space-y-5">
          <div className="inline-flex rounded-full border border-border/70 bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('badge')}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t('title')}</h1>
          <p className="text-lg text-muted-foreground sm:text-xl">{t('subtitle')}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>{t('bullets.otp')}</li>
            <li>{t('bullets.dashboard')}</li>
            <li>{t('bullets.localization')}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
