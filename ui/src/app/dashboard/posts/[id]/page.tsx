import type { Metadata, ResolvingMetadata } from 'next';

import { PostDetailPageClient } from '@/components/dashboard/divar-posts/post-detail-page-client';
import { fetchDivarPostForMetadata } from '@/lib/server/divar-posts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteParamsPromise = Promise<{ id: string }>;
type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;

const FALLBACK_TITLE = 'جزئیات آگهی';
const FALLBACK_DESCRIPTION = 'مشاهده جزئیات کامل این آگهی در ماهان.';

const normalizeUrl = (value: string | undefined): string => {
  if (!value) {
    return '';
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const RAW_APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:6005';
const APP_BASE_URL = normalizeUrl(RAW_APP_BASE_URL);

const toPlainText = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const stripped = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!stripped) {
    return null;
  }
  if (stripped.length <= 200) {
    return stripped;
  }
  return `${stripped.slice(0, 197)}…`;
};

const buildLocationSnippet = (
  district?: string | null,
  city?: string | null,
  province?: string | null,
): string | null => {
  const parts = [district, city, province].filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  return parts.join('، ');
};

const preferShareableImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url);
    const isDivarCdn = parsed.hostname.includes('divarcdn.com');
    if (!isDivarCdn) {
      return url;
    }
    let updatedPath = parsed.pathname;
    let mutated = false;
    if (updatedPath.includes('/webp_post/')) {
      updatedPath = updatedPath.replace('/webp_post/', '/post/');
      mutated = true;
    }
    if (updatedPath.includes('/webp_thumbnail/')) {
      updatedPath = updatedPath.replace('/webp_thumbnail/', '/thumbnail/');
      mutated = true;
    }
    if (updatedPath.endsWith('.webp')) {
      updatedPath = updatedPath.replace(/\.webp$/, '.jpg');
      mutated = true;
    }
    if (!mutated) {
      return url;
    }
    parsed.pathname = updatedPath;
    return parsed.toString();
  } catch {
    return url;
  }
};

export async function generateMetadata(
  { params }: { params: RouteParamsPromise; searchParams: SearchParamsPromise },
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await fetchDivarPostForMetadata(resolvedParams.id);
  const canonicalUrl =
    APP_BASE_URL && resolvedParams?.id
      ? `${APP_BASE_URL}/dashboard/posts/${resolvedParams.id}`
      : undefined;
  const derivedTitle =
    (post?.title && post.title.trim().length > 0
      ? post.title.trim()
      : post?.externalId
        ? `آگهی ${post.externalId}`
        : null) ?? FALLBACK_TITLE;
  const locationSnippet = buildLocationSnippet(
    post?.districtName,
    post?.cityName,
    post?.provinceName,
  );
  const derivedDescription =
    toPlainText(post?.description) ??
    (locationSnippet ? `مشاهده جزئیات آگهی در ${locationSnippet}` : null) ??
    FALLBACK_DESCRIPTION;
  const primaryImageUrl =
    post?.medias?.find((media) => media?.url)?.url ?? post?.imageUrl ?? undefined;
  const heroImage = preferShareableImageUrl(primaryImageUrl);

  return {
    title: derivedTitle,
    description: derivedDescription,
    alternates: canonicalUrl
      ? {
          canonical: canonicalUrl,
        }
      : undefined,
    openGraph: {
      title: derivedTitle,
      description: derivedDescription,
      url: canonicalUrl,
      type: 'article',
      siteName: 'ماهان',
      images: heroImage
        ? [
            {
              url: heroImage,
              secureUrl: heroImage,
              width: 1200,
              height: 630,
              alt: derivedTitle,
              type: 'image/jpeg',
            },
          ]
        : undefined,
    },
    twitter: {
      card: heroImage ? 'summary_large_image' : 'summary',
      title: derivedTitle,
      description: derivedDescription,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

type PageProps = {
  params: RouteParamsPromise;
  searchParams: SearchParamsPromise;
};

export default async function DashboardPostDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  return <PostDetailPageClient postId={resolvedParams.id} />;
}
