/* eslint-disable @next/next/no-img-element, tailwindcss/classnames-order */
import type { JSX, TouchEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Maximize2,
  MapPin,
  X,
} from 'lucide-react';
import type { useTranslations } from 'next-intl';

import type { DivarPostSummary } from '@/types/divar-posts';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
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
  hasDownloadableMedia: boolean;
  onRequestDownload: () => void;
  t: ReturnType<typeof useTranslations>;
};

export function PostMediaCarousel({
  post,
  isRTL,
  businessBadge,
  cityDistrict,
  hasDownloadableMedia,
  onRequestDownload,
  t,
}: PostMediaCarouselProps): JSX.Element | null {
  const [activeIndex, setActiveIndex] = useState(0);
  const [swipeDelta, setSwipeDelta] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeLastXRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
    setSwipeDelta(0);
  }, [post.id]);

  const mediaCount = post.medias.length;
  const hasMultiplePhotos = mediaCount > 1;
  const hasMedia = mediaCount > 0 || Boolean(post.imageUrl);
  const showThumbnailScrollHint = mediaCount > 3;
  const previousPhotoLabel = isRTL ? 'عکس قبلی' : 'Previous photo';
  const nextPhotoLabel = isRTL ? 'عکس بعدی' : 'Next photo';
  const fullScreenLabel = isRTL ? 'نمایش تمام‌صفحه' : 'View full screen';
  const PreviousIcon = ChevronLeft;
  const NextIcon = ChevronRight;

  const currentMedia =
    mediaCount > 0 ? post.medias[activeIndex % mediaCount] ?? post.medias[0] : null;
  const currentMediaSrc = resolveMediaSrc(currentMedia, post.imageUrl);
  const previousMedia = hasMultiplePhotos
    ? post.medias[(activeIndex - 1 + mediaCount) % mediaCount]
    : null;
  const nextMedia = hasMultiplePhotos
    ? post.medias[(activeIndex + 1) % mediaCount]
    : null;

  useEffect(() => {
    setImageFailed(false);
    setImageLoading(Boolean(currentMediaSrc));
  }, [currentMediaSrc, post.id]);

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

  const handleOpenLightbox = useCallback(() => {
    setLightboxOpen(true);
  }, []);

  const handleLightboxKey = useCallback(
    (event: KeyboardEvent) => {
      if (!lightboxOpen) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setLightboxOpen(false);
        return;
      }
      if (!hasMultiplePhotos) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      }
    },
    [goToNext, goToPrevious, hasMultiplePhotos, lightboxOpen],
  );

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }
    window.addEventListener('keydown', handleLightboxKey);
    return () => window.removeEventListener('keydown', handleLightboxKey);
  }, [handleLightboxKey, lightboxOpen]);

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

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageFailed(true);
    setImageLoading(false);
  }, []);

  const renderOverlayBadges = (): JSX.Element | null => {
    if (!cityDistrict && !hasMedia) {
      return null;
    }
    return (
      <>
        {hasMedia ? (
          <button
            type="button"
            onClick={handleOpenLightbox}
            className="pointer-events-auto absolute bottom-3 left-3 z-10 inline-flex size-7 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition hover:bg-black/80"
            aria-label={fullScreenLabel}
          >
            <Maximize2 className="size-3" aria-hidden />
          </button>
        ) : null}
        {cityDistrict ? (
          <span className="pointer-events-none absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
            <MapPin className="size-3.5" aria-hidden />
            {cityDistrict}
          </span>
        ) : null}
      </>
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
            src={currentMediaSrc}
            alt={post.title ?? post.externalId}
            className="h-64 w-full object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          {imageLoading && !imageFailed ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="size-5 animate-pulse" aria-hidden />
                <span className="animate-pulse">{t('loading')}</span>
              </div>
            </div>
          ) : null}
          {!currentMediaSrc || imageFailed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted text-sm text-muted-foreground">
              <ImageIcon className="size-6" aria-hidden />
              <span>{t('noImage')}</span>
            </div>
          ) : null}
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
            src={currentMediaSrc}
            alt={resolveMediaAlt(currentMedia, post.title, post.externalId)}
            className="relative size-full select-none object-cover"
            draggable={false}
            style={{
              transform: `translateX(${swipeDelta}px)`,
              transition: isSwiping ? 'none' : 'transform 200ms ease',
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
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
        {imageLoading && !imageFailed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="size-5 animate-pulse" aria-hidden />
              <span className="animate-pulse">{t('loading')}</span>
            </div>
          </div>
        ) : null}
        {!currentMediaSrc || imageFailed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted text-sm text-muted-foreground">
            <ImageIcon className="size-6" aria-hidden />
            <span>{t('noImage')}</span>
          </div>
        ) : null}
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
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          hideCloseButton
          className="h-dvh w-dvw max-w-none rounded-none bg-black p-0"
        >
          <div
            className="relative flex size-full items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <DialogClose className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
              <X className="size-5" aria-hidden />
            </DialogClose>
            <img
              src={resolveMediaSrc(currentMedia, post.imageUrl)}
              alt={resolveMediaAlt(currentMedia, post.title, post.externalId)}
              className="max-h-[88vh] max-w-[92vw] object-contain"
            />
            {hasMultiplePhotos ? (
              <>
                <button
                  type="button"
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  aria-label={previousPhotoLabel}
                >
                  <PreviousIcon className="size-6" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  aria-label={nextPhotoLabel}
                >
                  <NextIcon className="size-6" aria-hidden />
                </button>
                <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                  {activeIndex + 1} / {mediaCount}
                </span>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
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
