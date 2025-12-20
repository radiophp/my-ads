/* eslint-disable @next/next/no-img-element */
import type { JSX, KeyboardEvent, MouseEvent } from 'react';
import { useEffect, useState } from 'react';
import { Camera, Clock3, MapPin, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import type { DivarPostSummary } from '@/types/divar-posts';
import type { useTranslations } from 'next-intl';
import { getBusinessTypeBadge } from './business-badge';
import { cn } from '@/lib/utils';

type PostCardProps = {
  post: DivarPostSummary;
  t: ReturnType<typeof useTranslations>;
  formatPrice: (value: number | string | null | undefined) => string | null;
  getRelativeLabel: (isoDate: string | null, jalaliFallback?: string | null) => string | null;
  dateFormatter: Intl.DateTimeFormat;
  onSelect: (post: DivarPostSummary) => void;
};

export function PostCard({
  post,
  t,
  formatPrice,
  getRelativeLabel,
  dateFormatter,
  onSelect,
}: PostCardProps): JSX.Element {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoading, setImageLoading] = useState<boolean>(Boolean(post.imageUrl));

  useEffect(() => {
    setImageFailed(false);
    setImageLoading(Boolean(post.imageUrl));
  }, [post.imageUrl]);
  const publishedLabel = getRelativeLabel(post.publishedAt, post.publishedAtJalali);
  const priceLabel = formatPrice(post.priceTotal);
  const rentLabel = formatPrice(post.rentAmount);
  const depositLabel = formatPrice(post.depositAmount);
  const pricePerSquareLabel =
    formatPrice(post.pricePerSquare) ??
    formatPrice(
      post.priceTotal && post.area && post.priceTotal > 0 && post.area > 0
        ? post.priceTotal / post.area
        : null,
    );
  const publishedText = publishedLabel ?? dateFormatter.format(new Date(post.createdAt));
  const mediaCountLabel = t('mediaCount', { count: post.mediaCount ?? 0 });
  const businessBadge = getBusinessTypeBadge(post.businessType ?? null, t);
  const detailHref = `/dashboard/posts/${post.id}`;
  const isPhotosVerified = post.photosVerified === true;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    onSelect(post);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(post);
    }
  };

  return (
    <Link
      href={detailHref}
      className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <article className="bg-card flex h-full flex-col gap-3 rounded-xl border border-border/70 p-4 shadow-sm transition hover:border-primary/60">
        <div className="flex flex-col gap-3">
          <div className="-mx-4 -mt-4 overflow-hidden rounded-t-xl">
            <div className="relative">
              {businessBadge ? (
                <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                  {businessBadge.icon}
                  {businessBadge.label}
                </span>
              ) : null}
              <div className="relative h-48 w-full bg-muted">
                <img
                  src={post.imageUrl ?? ''}
                  alt=""
                  className={cn(
                    'size-full object-cover transition-opacity duration-200',
                    post.imageUrl && !imageFailed ? 'opacity-100' : 'opacity-0',
                  )}
                  loading="lazy"
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageFailed(true)}
                />
                {imageLoading && !imageFailed ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="size-5 animate-pulse" aria-hidden />
                      <span className="animate-pulse">{t('loading')}</span>
                    </div>
                  </div>
                ) : null}
                {!post.imageUrl || imageFailed ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted text-sm text-muted-foreground">
                    <ImageIcon className="size-6" aria-hidden />
                    <span>{t('noImage')}</span>
                  </div>
                ) : null}
              </div>
              <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap gap-2 text-xs font-medium text-white">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5">
                  <Clock3 className="size-3.5" aria-hidden />
                  {publishedText}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5">
                  <Camera className="size-3.5" aria-hidden />
                  {isPhotosVerified ? mediaCountLabel : `${mediaCountLabel} ${t('decorativePhotos')}`}
                </span>
              </div>
          </div>
          </div>

          <div className="flex flex-1 flex-col gap-2 pt-1">
            <h3 className="break-words text-sm font-semibold text-foreground sm:text-base">
              {post.title ?? t('untitled', { externalId: post.externalId })}
            </h3>
            {post.code ? (
              <span className="inline-flex w-fit items-center gap-1 rounded-md border border-border/70 bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                {t('labels.postCode')}: <span className="font-mono">{post.code}</span>
              </span>
            ) : null}
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 text-foreground">
                <MapPin className="size-4" aria-hidden />
                {post.cityName}
                {post.districtName ? `، ${post.districtName}` : null}
                {post.provinceName ? `، ${post.provinceName}` : null}
              </span>
              {post.area ? <span>{t('areaLabel', { value: post.area })}</span> : null}
              {priceLabel ? <span>{t('priceLabel', { value: priceLabel })}</span> : null}
              {depositLabel ? (
                <span>
                  {t('labels.depositAmount')}: {depositLabel}
                </span>
              ) : null}
              {rentLabel ? <span>{t('rentLabel', { value: rentLabel })}</span> : null}
              {pricePerSquareLabel ? (
                <span>
                  {t('labels.pricePerSquare')}: {pricePerSquareLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
