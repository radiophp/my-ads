import { getTranslations } from 'next-intl/server';

import { buildSeoMetadata } from '@/lib/server/seo';

export async function generateMetadata() {
  const t = await getTranslations('about');
  return buildSeoMetadata({
    pageKey: 'about',
    defaultTitle: t('title'),
    defaultDescription: t('description'),
    canonicalPath: '/about',
  });
}

export default async function AboutPage() {
  const t = await getTranslations('about');

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t('title')}
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">{t('description')}</p>
      </header>
      <div className="rounded-2xl border border-border/70 bg-muted/30 p-6 text-base leading-8 text-foreground">
        {t('body')}
      </div>
    </div>
  );
}
