import { getTranslations } from 'next-intl/server';

import { buildSeoMetadata } from '@/lib/server/seo';
import { fetchPreviewPosts } from '@/lib/server/divar-posts';
import { PreviewPostsSection } from '@/components/preview/preview-posts-section';

export const revalidate = 60;

type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;

type PreviewPageProps = {
  searchParams?: SearchParamsPromise;
};

const parseParam = (value: string | string[] | undefined): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
};

const normalizeSlugLabel = (value: string): string =>
  decodeURIComponent(value).replace(/-/g, ' ').trim();

const buildLocationLabel = (params: {
  city?: string;
  district?: string;
  posts: Awaited<ReturnType<typeof fetchPreviewPosts>>;
}): string | null => {
  const { city, district, posts } = params;
  const first = posts[0];
  const parts: string[] = [];

  if (district) {
    parts.push(first?.districtName?.trim() || normalizeSlugLabel(district));
  } else if (city) {
    parts.push(first?.cityName?.trim() || normalizeSlugLabel(city));
  }

  if (first?.provinceName?.trim()) {
    parts.push(first.provinceName.trim());
  }

  const uniqueParts = Array.from(new Set(parts.filter(Boolean)));
  return uniqueParts.length ? uniqueParts.join('، ') : null;
};

export async function generateMetadata({ searchParams }: PreviewPageProps) {
  const t = await getTranslations('preview');
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const city = parseParam(resolvedSearchParams?.city);
  const district = parseParam(resolvedSearchParams?.district);
  const previewPosts = await fetchPreviewPosts({ city, district, limit: 1 });
  const locationLabel = buildLocationLabel({ city, district, posts: previewPosts });
  const previewDescription = t('description');
  const baseMetadata = await buildSeoMetadata({
    pageKey: 'preview',
    defaultTitle: t('title'),
    defaultDescription: previewDescription,
    canonicalPath: '/preview',
  });

  const rawTitle =
    typeof baseMetadata.title === 'string' ? baseMetadata.title : t('title');
  const title = locationLabel ? `${rawTitle} - ${locationLabel}` : rawTitle;

  return {
    ...baseMetadata,
    title,
    description: previewDescription,
    openGraph: {
      ...baseMetadata.openGraph,
      title,
      description: previewDescription,
    },
  };
}

export default async function PreviewPage({ searchParams }: PreviewPageProps) {
  const t = await getTranslations('preview');
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const city = parseParam(resolvedSearchParams?.city);
  const district = parseParam(resolvedSearchParams?.district);
  const posts = await fetchPreviewPosts({ city, district, limit: 40 });
  const locationLabel = buildLocationLabel({ city, district, posts });
  const title = locationLabel
    ? t('titleWithLocation', { location: locationLabel })
    : t('title');

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>
      <PreviewPostsSection posts={posts} emptyLabel={t('empty')} />
    </div>
  );
}
