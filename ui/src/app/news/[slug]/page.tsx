import { headers } from 'next/headers';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import type { NewsItem } from '@/types/news';
import { normalizeStorageHtml, normalizeStorageUrl } from '@/lib/storage';

export const revalidate = 300;

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
  const imageUrl = toAbsoluteUrl(appBase, normalizedMainImageUrl);
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

      <article className="prose prose-sm prose-headings:text-foreground prose-p:text-muted-foreground prose-img:block prose-img:h-auto prose-img:max-w-full prose-img:mx-auto max-w-none text-foreground">
        <div
          className="whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: normalizedContentBody }}
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
    </div>
  );
}
