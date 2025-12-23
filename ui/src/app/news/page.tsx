import { headers } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';

import type { NewsItem, NewsListResponse } from '@/types/news';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPagination = totalPages > 1;
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;
  const buildPageHref = (targetPage: number) =>
    targetPage === 1 ? '/news' : `/news?page=${targetPage}`;

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));

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
              <article
                key={item.id}
                className="bg-card group overflow-hidden rounded-2xl border border-border/70 shadow-sm transition hover:border-primary/50"
              >
                <Link href={`/news/${item.slug}`} className="flex h-full flex-col">
                  <div className="relative h-48 w-full overflow-hidden bg-muted/40">
                    {item.mainImageUrl ? (
                      <Image
                        src={item.mainImageUrl}
                        alt={item.title}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted/20 via-muted/40 to-muted/10 text-sm text-muted-foreground">
                        {t('labels.noImage')}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {item.category?.name && (
                        <span className="rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-foreground">
                          {item.category.name}
                        </span>
                      )}
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <h2 className="line-clamp-2 text-base font-semibold text-foreground">
                      {item.title}
                    </h2>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {item.shortText ?? item.content ?? ''}
                    </p>
                    {item.tags.length > 0 && (
                      <div className="mt-auto flex flex-wrap gap-2 pt-2 text-xs text-muted-foreground">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full border border-border/70 px-2 py-0.5"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </article>
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
