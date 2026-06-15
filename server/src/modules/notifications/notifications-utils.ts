import { Prisma } from '@prisma/client';
import type { DivarPostListItemDto } from '@app/modules/divar-posts/dto/divar-post.dto';
import type { StoredNotificationPayload } from './notification.types';

export function castDecimal(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || typeof value === 'undefined') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (value instanceof Prisma.Decimal) {
    return Number(value.toString());
  }
  return null;
}

export function resolveMediaFromRelation(media?: {
  url: string | null;
  thumbnailUrl: string | null;
  localUrl: string | null;
  localThumbnailUrl: string | null;
}): string | null {
  if (!media) {
    return null;
  }
  return media.localThumbnailUrl ?? media.thumbnailUrl ?? media.localUrl ?? media.url ?? null;
}

export function parseNullableString(source: Prisma.JsonValue, key: string): string | null {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return null;
  }
  const value = (source as Prisma.JsonObject)[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function parseNullableNumber(source: Prisma.JsonValue, key: string): number | null {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return null;
  }
  const value = (source as Prisma.JsonObject)[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parsePayload(payload: Prisma.JsonValue | null): StoredNotificationPayload | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const data = payload as Prisma.JsonObject;
  const filter = data['filter'];
  const post = data['post'];
  if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
    return null;
  }
  if (!post || typeof post !== 'object' || Array.isArray(post)) {
    return null;
  }
  return {
    filter: {
      id:
        typeof (filter as Prisma.JsonObject)['id'] === 'string'
          ? ((filter as Prisma.JsonObject)['id'] as string)
          : '',
      name:
        typeof (filter as Prisma.JsonObject)['name'] === 'string'
          ? ((filter as Prisma.JsonObject)['name'] as string)
          : '',
    },
    post: {
      id:
        typeof (post as Prisma.JsonObject)['id'] === 'string'
          ? ((post as Prisma.JsonObject)['id'] as string)
          : '',
      code: parseNullableNumber(post, 'code'),
      title: parseNullableString(post, 'title'),
      description: parseNullableString(post, 'description'),
      priceTotal: parseNullableNumber(post, 'priceTotal'),
      rentAmount: parseNullableNumber(post, 'rentAmount'),
      depositAmount: parseNullableNumber(post, 'depositAmount'),
      pricePerSquare: parseNullableNumber(post, 'pricePerSquare'),
      area: parseNullableNumber(post, 'area'),
      cityName: parseNullableString(post, 'cityName'),
      districtName: parseNullableString(post, 'districtName'),
      provinceName: parseNullableString(post, 'provinceName'),
      permalink: parseNullableString(post, 'permalink'),
      publishedAt: parseNullableString(post, 'publishedAt'),
      previewImageUrl: parseNullableString(post, 'previewImageUrl'),
    },
  };
}

export function computeJitteredDelay(baseMs: number, jitterRatio: number): number {
  if (!Number.isFinite(baseMs) || baseMs <= 0) {
    return 0;
  }
  const ratio = Math.min(Math.max(jitterRatio, 0), 1);
  const jitter = baseMs * ratio;
  const delta = (Math.random() * 2 - 1) * jitter;
  const delay = Math.round(baseMs + delta);
  return Math.max(0, delay);
}

export function resolvePreviewImage(post: DivarPostListItemDto): string | null {
  const media = post.medias?.[0];
  if (!media) {
    return null;
  }
  const enriched = media as typeof media & {
    localUrl?: string | null;
    localThumbnailUrl?: string | null;
  };
  return (
    enriched.localThumbnailUrl ?? enriched.thumbnailUrl ?? enriched.localUrl ?? enriched.url ?? null
  );
}

export function buildPayloadSnapshot(
  post: DivarPostListItemDto,
  filter: { id: string; name: string },
): StoredNotificationPayload {
  return {
    filter,
    post: {
      id: post.id,
      code: post.code ?? null,
      title: post.title ?? null,
      description: post.description ?? null,
      priceTotal: post.priceTotal ?? null,
      rentAmount: post.rentAmount ?? null,
      depositAmount: post.depositAmount ?? null,
      pricePerSquare: post.pricePerSquare ?? null,
      area: post.area ?? null,
      cityName: post.cityName ?? null,
      districtName: post.districtName ?? null,
      provinceName: post.provinceName ?? null,
      permalink: post.permalink ?? null,
      publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
      previewImageUrl: resolvePreviewImage(post),
    },
  };
}
