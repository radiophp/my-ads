/* eslint-disable @next/next/no-img-element, tailwindcss/classnames-order */
import type { JSX, TouchEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Download,
  MapPin,
  Clock3,
} from 'lucide-react';
import type { useTranslations } from 'next-intl';

import type { DivarPostSummary } from '@/types/divar-posts';
import { resolveMediaAlt, resolveMediaSrc } from './helpers';

type BusinessBadge = {
  label: string;
  className: string;
  icon?: JSX.Element;
} | null;

type PostMediaCarouselProps = {
  post: DivarPostSummary;
  isRTL: boolean;
  businessBadge: BusinessBadge;
  cityDistrict: string | null;
  publishedDisplay: string | null;
  hasDownloadableMedia: boolean;
  onRequestDownload: () => void;
  t: ReturnType<typeof useTranslations>;
};

export function PostMediaCarousel({
  post,
  isRTL,
  businessBadge,
  cityDistrict,
  publishedDisplay,
  hasDownloadableMedia,
  onRequestDownload,
  t,
}: PostMediaCarouselProps): JSX.Element | null {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swipeDelta, setSwipeDelta] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeLastXRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
    setSwipeDelta(0);
  }, [post.id]);

  const mediaCount = post.medias.length;
  const hasMultiplePhotos = mediaCount > 1;
  const showThumbnailScrollHint = mediaCount > 3;
  const previousPhotoLabel = isRTL ? 'عکس قبلی' : 'Previous photo';
  const nextPhotoLabel = isRTL ? 'عکس بعدی' : 'Next photo';
  const PreviousIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  const currentMedia =
    mediaCount > 0 ? post.medias[activeIndex % mediaCount] ?? post.medias[0] : null;
  const previousMedia = hasMultiplePhotos
    ? post.medias[(activeIndex - 1 + mediaCount) % mediaCount]
    : null;
  const nextMedia = hasMultiplePhotos
    ? post.medias[(activeIndex + 1) % mediaCount]
    : null;

  const goToPrevious = useCallback(() => {
    if (!hasMultiplePhotos) {
      return;
    }
    setActiveIndex((prev) => (prev - 1 + mediaCount) % mediaCount);
  }, [hasMultiplePhotos, mediaCount]);

  const goToNext = useCallback(() => {
    if (!hasMultiplePhotos) {
      return;
    }
    setActiveIndex((prev) => (prev + 1) % mediaCount);
  }, [hasMultiplePhotos, mediaCount]);

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!hasMultiplePhotos) {
        return;
      }
      const touch = event.touches[0];
      swipeStartXRef.current = touch.clientX;
      swipeLastXRef.current = touch.clientX;
      setIsSwiping(true);
      setSwipeDelta(0);
    },
    [hasMultiplePhotos],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!hasMultiplePhotos) {
        return;
      }
      const touch = event.touches[0];
      swipeLastXRef.current = touch.clientX;
      if (swipeStartXRef.current !== null) {
        setSwipeDelta(touch.clientX - swipeStartXRef.current);
      }
    },
    [hasMultiplePhotos],
  );

  const handleTouchEnd = useCallback(() => {
    if (!hasMultiplePhotos) {
      return;
    }
    const startX = swipeStartXRef.current;
    const endX = swipeLastXRef.current;
    swipeStartXRef.current = null;
    swipeLastXRef.current = null;
    setIsSwiping(false);
    if (startX === null || endX === null) {
      setSwipeDelta(0);
      return;
    }
    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 40) {
      setSwipeDelta(0);
      return;
    }
    if (deltaX > 0) {
      goToPrevious();
    } else {
      goToNext();
    }
    setSwipeDelta(0);
  }, [goToNext, goToPrevious, hasMultiplePhotos]);

  const renderOverlayBadges = (): JSX.Element | null => {
    if (!publishedDisplay && !cityDistrict) {
      return null;
    }
    return (
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-center text-xs font-medium text-white">
        <div className="flex flex-1 justify-start">
          {cityDistrict ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5">
              <MapPin className="size-3.5" aria-hidden />
              {cityDistrict}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 justify-end">
          {publishedDisplay ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5">
              <Clock3 className="size-3.5" aria-hidden />
              {publishedDisplay}
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  const renderTopBadges = (): JSX.Element | null => {
    if (!businessBadge && !hasDownloadableMedia) {
      return null;
    }
    return (
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-center text-xs font-medium text-white">
        <div className="flex flex-1 justify-start">
          {businessBadge ? (
            <span
              className={`pointer-events-none rounded-full px-3 py-1 text-xs font-medium text-white shadow-lg ${businessBadge.className}`}
            >
              {businessBadge.label}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 justify-end">
          {hasDownloadableMedia ? (
            <button
              type="button"
              onClick={onRequestDownload}
              className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white shadow-lg hover:bg-black/80"
            >
              <Download className="size-3.5" aria-hidden />
              <span>{t('downloadPhotos')}</span>
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderMediaBlock = (): JSX.Element => {
    if (mediaCount === 0) {
      return (
        <div className="relative overflow-hidden rounded-lg border border-border/60">
          {renderTopBadges()}
          <img
            src={post.imageUrl ?? ''}
            alt={post.title ?? post.externalId}
            className="h-64 w-full object-cover"
          />
          {renderOverlayBadges()}
        </div>
      );
    }

    return (
      <div
        className="relative overflow-hidden rounded-lg border border-border/60"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {renderTopBadges()}
        <div className="relative h-64 w-full overflow-hidden">
          {hasMultiplePhotos ? (
            <img
              src={resolveMediaSrc(previousMedia, post.imageUrl)}
              alt={resolveMediaAlt(previousMedia, post.title, post.externalId)}
              className="absolute inset-0 size-full select-none object-cover"
              draggable={false}
              style={{
                transform: `translateX(calc(-100% + ${swipeDelta}px))`,
                transition: isSwiping ? 'none' : 'transform 200ms ease',
              }}
            />
          ) : null}
          <img
            src={resolveMediaSrc(currentMedia, post.imageUrl)}
            alt={resolveMediaAlt(currentMedia, post.title, post.externalId)}
            className="relative size-full select-none object-cover"
            draggable={false}
            style={{
              transform: `translateX(${swipeDelta}px)`,
              transition: isSwiping ? 'none' : 'transform 200ms ease',
            }}
          />
          {hasMultiplePhotos ? (
            <img
              src={resolveMediaSrc(nextMedia, post.imageUrl)}
              alt={resolveMediaAlt(nextMedia, post.title, post.externalId)}
              className="absolute inset-0 size-full select-none object-cover"
              draggable={false}
              style={{
                transform: `translateX(calc(100% + ${swipeDelta}px))`,
                transition: isSwiping ? 'none' : 'transform 200ms ease',
              }}
            />
          ) : null}
        </div>
        {hasMultiplePhotos ? (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition hover:bg-black/80 sm:flex"
              aria-label={previousPhotoLabel}
            >
              <PreviousIcon className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition hover:bg-black/80 sm:flex"
              aria-label={nextPhotoLabel}
            >
              <NextIcon className="size-5" aria-hidden />
            </button>
          </>
        ) : null}
        {renderOverlayBadges()}
      </div>
    );
  };

  if (mediaCount === 0 && !post.imageUrl) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="mx-auto w-full max-w-[400px]">{renderMediaBlock()}</div>
      {mediaCount > 1 ? (
        <>
          <div className="relative mx-auto w-full max-w-[400px]">
            <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 pr-8">
              {post.medias.map((media, index) => (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`shrink-0 overflow-hidden rounded-md border ${
                    index === activeIndex
                      ? 'border-primary'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <img
                    src={media.thumbnailUrl ?? media.url}
                    alt={media.alt ?? media.id}
                    className="size-16 object-cover"
                  />
                </button>
              ))}
            </div>
            {showThumbnailScrollHint ? (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
            ) : null}
          </div>
          {showThumbnailScrollHint ? (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
              <ArrowLeftRight className="size-3.5" aria-hidden />
              <span>{t('mediaScrollHint')}</span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
