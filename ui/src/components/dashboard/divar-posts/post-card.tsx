/* eslint-disable @next/next/no-img-element */
import type { JSX } from 'react';
import { Camera, Clock3, MapPin } from 'lucide-react';

import type { DivarPostSummary } from '@/types/divar-posts';
import type { useTranslations } from 'next-intl';

type BusinessBadge = {
  label: string;
  className: string;
  icon?: JSX.Element;
} | null;

type PostCardProps = {
  post: DivarPostSummary;
  t: ReturnType<typeof useTranslations>;
  formatPrice: (value: number | null | undefined) => string | null;
  getRelativeLabel: (isoDate: string | null, jalaliFallback?: string | null) => string | null;
  dateFormatter: Intl.DateTimeFormat;
  getBusinessBadge: (value: string | null) => BusinessBadge;
  onSelect: (post: DivarPostSummary) => void;
};

export function PostCard({
  post,
  t,
  formatPrice,
  getRelativeLabel,
  dateFormatter,
  getBusinessBadge,
  onSelect,
}: PostCardProps): JSX.Element {
  const publishedLabel = getRelativeLabel(post.publishedAt, post.publishedAtJalali);
  const priceLabel = formatPrice(post.priceTotal);
  const rentLabel = formatPrice(post.rentAmount);
  const pricePerSquareLabel = formatPrice(post.pricePerSquare);
  const publishedText = publishedLabel ?? dateFormatter.format(new Date(post.createdAt));
  const mediaCountLabel = t('mediaCount', { count: post.mediaCount ?? 0 });
  const businessBadge = getBusinessBadge(post.businessType ?? null);

  return (
    <article
      className="bg-card flex h-full cursor-pointer flex-col gap-3 rounded-xl border border-border/70 p-4 shadow-sm transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(post)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(post);
        }
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="-mx-4 -mt-4 overflow-hidden rounded-t-xl">
          <div className="relative">
            {businessBadge ? (
              <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                {businessBadge.icon}
                {businessBadge.label}
              </span>
            ) : null}
            {post.imageUrl ? (
              <div className="relative h-48 w-full bg-muted">
                <img
                  src={post.imageUrl}
                  alt={post.title ?? post.externalId}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="relative flex h-48 w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                {t('noImage')}
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap gap-2 text-xs font-medium text-white">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5">
                <Clock3 className="size-3.5" aria-hidden />
                {publishedText}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5">
                <Camera className="size-3.5" aria-hidden />
                {mediaCountLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 pt-1">
          <h3 className="break-words text-base font-semibold text-foreground sm:text-lg">
            {post.title ?? t('untitled', { externalId: post.externalId })}
          </h3>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-foreground">
              <MapPin className="size-4" aria-hidden />
              {post.cityName}
              {post.districtName ? `، ${post.districtName}` : null}
              {post.provinceName ? `، ${post.provinceName}` : null}
            </span>
            {post.area ? <span>{t('areaLabel', { value: post.area })}</span> : null}
            {priceLabel ? <span>{t('priceLabel', { value: priceLabel })}</span> : null}
            {rentLabel ? <span>{t('rentLabel', { value: rentLabel })}</span> : null}
            {pricePerSquareLabel ? (
              <span>{t('labels.pricePerSquare', { value: pricePerSquareLabel })}</span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
