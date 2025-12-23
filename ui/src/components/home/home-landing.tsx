import { getTranslations } from 'next-intl/server';
import { HomeCategoryKpis } from '@/components/home/home-category-kpis';
import { HomeAuthPanel } from '@/components/home/home-auth-panel';

export async function HomeLanding() {
  const t = await getTranslations('landing');
  const siteBase =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:6005';
  const siteUrl = (() => {
    try {
      return new URL(siteBase).origin;
    } catch {
      return 'http://localhost:6005';
    }
  })();
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'ماهان فایل',
      url: siteUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'ماهان فایل',
      url: siteUrl,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="grid w-full gap-10 py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
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
        <section>
          <HomeAuthPanel />
        </section>
      </main>
      <HomeCategoryKpis />
    </div>
  );
}
