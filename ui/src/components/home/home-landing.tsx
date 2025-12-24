import { headers } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { HomeCategoryKpis } from '@/components/home/home-category-kpis';
import { HomeAuthPanel } from '@/components/home/home-auth-panel';
import { HomeSlider } from '@/components/home/home-slider';
import type { NewsItem, NewsListResponse } from '@/types/news';
import type { BlogItem, BlogListResponse } from '@/types/blog';
import type { Slide } from '@/types/slide';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { NewsCard } from '@/components/news/news-card';
import { BlogCard } from '@/components/blog/blog-card';

const normalizeBaseUrl = (value: string): string => value.replace(/\/$/, '');

const resolveApiBase = async (): Promise<string> => {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) return normalizeBaseUrl(envBase);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return `${normalizeBaseUrl(appUrl)}/api`;

  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}/api`;

  return '';
};

const resolveAppBase = async (): Promise<string> => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (appUrl) return normalizeBaseUrl(appUrl);

  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;

  return '';
};

const fetchLatestNews = async (): Promise<NewsItem[]> => {
  const apiBase = await resolveApiBase();
  if (!apiBase) {
    return [];
  }

  try {
    const response = await fetch(`${apiBase}/news?page=1&pageSize=6`, {
      next: { revalidate: 600 },
    });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as NewsListResponse;
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
};

const fetchLatestBlogs = async (): Promise<BlogItem[]> => {
  const apiBase = await resolveApiBase();
  if (!apiBase) {
    return [];
  }

  try {
    const response = await fetch(`${apiBase}/blog?page=1&pageSize=6`, {
      next: { revalidate: 600 },
    });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as BlogListResponse;
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
};

const fetchSlides = async (): Promise<Slide[]> => {
  const apiBase = await resolveApiBase();
  if (!apiBase) {
    return [];
  }

  try {
    const response = await fetch(`${apiBase}/slides`, {
      next: { revalidate: 600 },
    });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as Slide[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

export async function HomeLanding() {
  const t = await getTranslations('landing');
  const locale = await getLocale();
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

  const slides = await fetchSlides();
  const latestNews = await fetchLatestNews();
  const latestBlogs = await fetchLatestBlogs();
  const appBase = await resolveAppBase();
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {slides.length > 0 ? (
        <div className="-mx-4">
          <HomeSlider slides={slides} locale={locale} appBase={appBase} />
        </div>
      ) : null}
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
      <section className="space-y-6 pb-16">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">{t('news.title')}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t('news.description')}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/news">{t('news.more')}</Link>
          </Button>
        </div>
        {latestNews.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('news.empty')}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {latestNews.map((item) => (
              <NewsCard key={item.id} item={item} locale={locale} appBase={appBase} />
            ))}
          </div>
        )}
      </section>
      <section className="space-y-6 pb-16">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">{t('blog.title')}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t('blog.description')}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/blog">{t('blog.more')}</Link>
          </Button>
        </div>
        {latestBlogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('blog.empty')}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {latestBlogs.map((item) => (
              <BlogCard key={item.id} item={item} locale={locale} appBase={appBase} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
