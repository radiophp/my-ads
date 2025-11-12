import type { DivarPostSummary } from '@/types/divar-posts';
import type { CategoryFilterValue } from '@/features/search-filter/searchFilterSlice';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL.length > 0
    ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '')
    : '/api';

export const buildPhotoDownloadUrl = (postId: string): string =>
  `${API_BASE_URL}/divar-posts/${postId}/photos.zip`;

export type DownloadableMedia = {
  id: string;
  url: string | null;
  thumbnailUrl: string | null;
  alt: string | null;
};

export const mapPostMediasToDownloadables = (post: DivarPostSummary): DownloadableMedia[] => {
  if (post.medias.length > 0) {
    return post.medias.map((media) => {
      const enriched = media as typeof media & {
        localUrl?: string | null;
        localThumbnailUrl?: string | null;
      };
      const localUrl = enriched.localUrl ?? null;
      const localThumb = enriched.localThumbnailUrl ?? null;
      return {
        id: media.id,
        url: localUrl ?? media.url ?? null,
        thumbnailUrl: localThumb ?? media.thumbnailUrl ?? localUrl ?? media.url ?? null,
        alt: media.alt,
      };
    });
  }

  if (post.imageUrl) {
    return [
      {
        id: `${post.id}-fallback`,
        url: post.imageUrl,
        thumbnailUrl: post.imageUrl,
        alt: post.title ?? post.externalId ?? null,
      },
    ];
  }

  return [];
};

export const getMediaDownloadUrl = (
  media: DivarPostSummary['medias'][number] | DownloadableMedia | null | undefined,
): string | null => {
  if (!media) {
    return null;
  }
  const candidate =
    'localUrl' in media
      ? (media as DivarPostSummary['medias'][number] & { localUrl?: string | null }).localUrl
      : null;
  return candidate ?? media.url ?? null;
};

export const resolveMediaSrc = (
  media: DivarPostSummary['medias'][number] | DownloadableMedia | null | undefined,
  fallback?: string | null,
): string => {
  if (!media) {
    return fallback ?? '';
  }
  if (
    'localUrl' in media &&
    typeof (media as { localUrl?: string | null }).localUrl === 'string' &&
    (media as { localUrl?: string | null }).localUrl
  ) {
    return (media as { localUrl?: string | null }).localUrl as string;
  }
  return media.url ?? fallback ?? '';
};

export const resolveMediaAlt = (
  media: DivarPostSummary['medias'][number] | DownloadableMedia | null | undefined,
  fallbackTitle?: string | null,
  fallbackId?: string,
): string =>
  media?.alt ?? media?.id ?? fallbackTitle ?? fallbackId ?? 'post-media';

export const sanitizeFileName = (value: string | null | undefined): string =>
  value ? value.replace(/[^a-zA-Z0-9-_]/g, '_') : 'photo';

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const serializeCategoryFilterValues = (
  filters: Record<string, CategoryFilterValue>,
): Record<string, unknown> | undefined => {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (!value) {
      continue;
    }
    switch (value.kind) {
      case 'numberRange': {
        const range: Record<string, number> = {};
        if (isFiniteNumber(value.min)) {
          range.min = value.min;
        }
        if (isFiniteNumber(value.max)) {
          range.max = value.max;
        }
        if (Object.keys(range).length > 0) {
          payload[key] = range;
        }
        break;
      }
      case 'multiSelect':
        if (value.values.length > 0) {
          payload[key] = value.values;
        }
        break;
      case 'singleSelect':
        if (typeof value.value === 'string' && value.value.length > 0) {
          payload[key] = value.value;
        }
        break;
      case 'boolean':
        if (value.value === true) {
          payload[key] = true;
        }
        break;
      default:
        break;
    }
  }
  return Object.keys(payload).length > 0 ? payload : undefined;
};
