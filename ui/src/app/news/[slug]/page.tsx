import type { Metadata, ResolvingMetadata } from 'next';
import { headers } from 'next/headers';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import type { NewsItem } from '@/types/news';
import { normalizeStorageHtml, normalizeStorageUrl } from '@/lib/storage';
import { Link } from '@/i18n/routing';
import { NewsCard } from '@/components/news/news-card';

export const revalidate = 300;

const SITE_NAME = 'ماهان فایل';

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

const toAbsoluteUrl = (base: string, value?: string | null): string | undefined => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (!base) return value;
  return `${base}${value.startsWith('/') ? '' : '/'}${value}`;
};

const toPlainText = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const stripped = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!stripped) return undefined;
  return stripped.length > 200 ? `${stripped.slice(0, 197)}…` : stripped;
};

const fetchNewsItem = async (slug: string): Promise<NewsItem | null> => {
  const apiBase = await resolveApiBase();
  if (!apiBase) {
    return null;
  }

  try {
    const response = await fetch(`${apiBase}/news/${encodeURIComponent(slug)}`, {
      next: { revalidate },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as NewsItem;
  } catch {
    return null;
  }
};

type NewsDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const fetchLatestNews = async (limit: number): Promise<NewsItem[]> => {
  const apiBase = await resolveApiBase();
  if (!apiBase) {
    return [];
  }

  try {
    const response = await fetch(`${apiBase}/news?page=1&pageSize=${limit}`, {
      next: { revalidate },
    });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as { items?: NewsItem[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
};

export async function generateMetadata(
  { params }: { params: NewsDetailPageProps['params'] },
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const t = await getTranslations('news');
  const { slug } = await params;
  const item = await fetchNewsItem(slug);
  const appBase = await resolveAppBase();
  const canonicalUrl = appBase ? `${appBase}/news/${slug}` : undefined;
  const derivedTitle = item?.title?.trim();
  const title = derivedTitle ? `${SITE_NAME} | ${derivedTitle}` : `${SITE_NAME} | ${t('title')}`;
  const description =
    toPlainText(item?.shortText) ??
    toPlainText(item?.content) ??
    t('description');
  const normalizedMainImageUrl = normalizeStorageUrl(item?.mainImageUrl, appBase);
  const imageUrl = toAbsoluteUrl(appBase, normalizedMainImageUrl);

  return {
    title,
    description,
    alternates: canonicalUrl
      ? {
          canonical: canonicalUrl,
        }
      : undefined,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'article',
      siteName: SITE_NAME,
      images: imageUrl
        ? [
            {
              url: imageUrl,
            },
          ]
        : undefined,
    },
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const t = await getTranslations('news');
  const locale = await getLocale();
  const { slug } = await params;
  const item = await fetchNewsItem(slug);
  const appBase = await resolveAppBase();

  if (!item) {
    notFound();
  }

  const formattedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(item.createdAt));
  const contentValue = item.content ?? '';
  const sourceCommentMatch = contentValue.match(/<!--\s*source:\s*([^>]+?)\s*-->/i);
  const sourceTextMatch = contentValue.match(/Source:\s*(\S+)/i);
  const sourceUrl = sourceCommentMatch?.[1] ?? sourceTextMatch?.[1];
  const contentBody = sourceCommentMatch
    ? contentValue.replace(sourceCommentMatch[0], '').trim()
    : sourceTextMatch
      ? contentValue.replace(sourceTextMatch[0], '').trim()
      : contentValue;
  const pageUrl = appBase ? `${appBase}/news/${item.slug}` : undefined;
  const normalizedMainImageUrl = normalizeStorageUrl(item.mainImageUrl, appBase);
  const normalizedContentBody = normalizeStorageHtml(contentBody ?? '', appBase);
  const wrappedContentBody = normalizedContentBody
    .replace(
      /<table/gi,
      '<div class="news-table-scroll"><div class="news-table-scroll-hint">← اسکرول →</div><table',
    )
    .replace(/<\/table>/gi, '</table></div>');
  const imageUrl = toAbsoluteUrl(appBase, normalizedMainImageUrl);
  const latestNews = await fetchLatestNews(9);
  const latestItems = latestNews.filter((news) => news.id !== item.id).slice(0, 9);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: item.title,
    ...(item.shortText ? { description: item.shortText } : {}),
    datePublished: item.createdAt,
    dateModified: item.updatedAt ?? item.createdAt,
    ...(pageUrl ? { mainEntityOfPage: pageUrl } : {}),
    ...(imageUrl ? { image: [imageUrl] } : {}),
    ...(item.category?.name ? { articleSection: item.category.name } : {}),
    ...(item.tags?.length ? { keywords: item.tags.map((tag) => tag.name).join(', ') } : {}),
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex items-center justify-end text-sm text-muted-foreground">
        <span>{formattedDate}</span>
      </div>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.category?.name && (
            <span className="rounded-full bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-foreground">
              {item.category.name}
            </span>
          )}
          <span>
            {t('labels.published')}: {formattedDate}
          </span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {item.title}
        </h1>
        {item.shortText && <p className="text-base text-muted-foreground">{item.shortText}</p>}
      </header>

      {normalizedMainImageUrl && (
        <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-border/70 bg-muted/30 sm:h-80">
          <Image
            src={normalizedMainImageUrl}
            alt={item.title}
            fill
            sizes="100vw"
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      )}

      <article className="prose prose-sm prose-headings:text-foreground prose-p:leading-8 prose-p:text-muted-foreground prose-img:block prose-img:h-auto prose-img:max-w-full prose-img:mx-auto max-w-none text-foreground">
        <div
          className="whitespace-pre-line leading-9 [&>div]:leading-9 [&_.news-table-scroll-hint]:sticky [&_.news-table-scroll-hint]:left-0 [&_.news-table-scroll-hint]:top-0 [&_.news-table-scroll-hint]:mb-2 [&_.news-table-scroll-hint]:inline-flex [&_.news-table-scroll-hint]:items-center [&_.news-table-scroll-hint]:rounded-full [&_.news-table-scroll-hint]:bg-black/70 [&_.news-table-scroll-hint]:px-2 [&_.news-table-scroll-hint]:py-0.5 [&_.news-table-scroll-hint]:text-[10px] [&_.news-table-scroll-hint]:text-white md:[&_.news-table-scroll-hint]:hidden [&_.news-table-scroll]:max-w-full [&_.news-table-scroll]:overflow-x-auto [&_.news-table-scroll]:rounded-lg [&_.news-table-scroll]:!border [&_.news-table-scroll]:!border-border/60 [&_.news-table-scroll]:bg-muted/20 [&_.news-table-scroll]:[-webkit-overflow-scrolling:touch] md:[&_.news-table-scroll]:overflow-x-visible [&_.news-table-scroll_table]:w-max [&_.news-table-scroll_table]:min-w-[920px] [&_.news-table-scroll_table]:border-collapse [&_.news-table-scroll_table]:!border [&_.news-table-scroll_table]:!border-border/70 md:[&_.news-table-scroll_table]:w-full md:[&_.news-table-scroll_table]:min-w-full md:[&_.news-table-scroll_table]:table-fixed [&_.news-table-scroll_td]:!border [&_.news-table-scroll_td]:!border-border/70 [&_.news-table-scroll_td]:!p-2 [&_.news-table-scroll_th]:!border [&_.news-table-scroll_th]:!border-border/70 [&_.news-table-scroll_th]:!p-2"
          dangerouslySetInnerHTML={{ __html: wrappedContentBody }}
        />
      </article>

      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t('labels.source')}
        </a>
      )}

      <div className="flex flex-col gap-3">
        <div className="text-sm font-medium text-foreground">{t('labels.tags')}</div>
        {item.tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('tags.empty')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <section className="border-t border-border/70 pt-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">{t('latest.title')}</h2>
          <Link href="/news" className="text-xs font-medium text-primary hover:underline">
            {t('latest.more')}
          </Link>
        </div>
        {latestItems.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('latest.empty')}</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestItems.map((news) => (
              <NewsCard
                key={news.id}
                item={news}
                locale={locale}
                appBase={appBase}
                sizes="(max-width: 1024px) 100vw, 33vw"
                imageHeightClass="h-32"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
