import { headers } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';

import type { NewsItem, NewsListResponse } from '@/types/news';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { NewsCard } from '@/components/news/news-card';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

const fetchNewsList = async (
  page: number,
  pageSize: number,
): Promise<{
  items: NewsItem[];
  hasError: boolean;
  total: number;
  page: number;
  pageSize: number;
}> => {
  const apiBase = await resolveApiBase();
  if (!apiBase) {
    return { items: [], hasError: true, total: 0, page, pageSize };
  }

  try {
    const response = await fetch(`${apiBase}/news?page=${page}&pageSize=${pageSize}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      return { items: [], hasError: true, total: 0, page, pageSize };
    }
    const data = (await response.json()) as NewsListResponse;
    if (!data || !Array.isArray(data.items)) {
      return { items: [], hasError: true, total: 0, page, pageSize };
    }
    return {
      items: data.items,
      hasError: false,
      total: data.total ?? 0,
      page: data.page ?? page,
      pageSize: data.pageSize ?? pageSize,
    };
  } catch {
    return { items: [], hasError: true, total: 0, page, pageSize };
  }
};

type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;

type NewsPageProps = {
  searchParams?: SearchParamsPromise;
};

const parsePage = (value: string | string[] | undefined) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const t = await getTranslations('news');
  const locale = await getLocale();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = parsePage(resolvedSearchParams?.page);
  const pageSize = 12;
  const { items, hasError, total } = await fetchNewsList(page, pageSize);
  const appBase = await resolveAppBase();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPagination = totalPages > 1;
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;
  const buildPageHref = (targetPage: number) =>
    targetPage === 1 ? '/news' : `/news?page=${targetPage}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t('title')}
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          {t('description')}
        </p>
      </header>

      {hasError && (
        <div className="rounded-xl border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
          {t('error')}
        </div>
      )}

      {items.length === 0 && !hasError ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-10 text-center text-sm text-muted-foreground">
          {t('empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <NewsCard key={item.id} item={item} locale={locale} appBase={appBase} />
            ))}
          </div>

          {hasPagination && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {t('pagination.label', { page, totalPages, totalItems: total })}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {prevPage ? (
                  <Button asChild variant="secondary" size="sm">
                    <Link href={buildPageHref(prevPage)}>{t('pagination.previous')}</Link>
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" disabled>
                    {t('pagination.previous')}
                  </Button>
                )}
                {nextPage ? (
                  <Button asChild variant="secondary" size="sm">
                    <Link href={buildPageHref(nextPage)}>{t('pagination.next')}</Link>
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" disabled>
                    {t('pagination.next')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
