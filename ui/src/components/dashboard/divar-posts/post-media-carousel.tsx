/* eslint-disable @next/next/no-img-element */
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Maximize2,
  MapPin,
  X,
} from 'lucide-react';
import type { useTranslations } from 'next-intl';
import type { Swiper as SwiperInstance } from 'swiper';
import { Navigation, Zoom, Keyboard, A11y, Mousewheel } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import type { DivarPostSummary } from '@/types/divar-posts';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  mapPostMediasToDownloadables,
  resolveMediaAlt,
  resolveMediaSrc,
  type DownloadableMedia,
} from './helpers';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/zoom';

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
  t: ReturnType<typeof useTranslations>;
};

export function PostMediaCarousel({
  post,
  isRTL,
  businessBadge,
  cityDistrict,
  t,
}: PostMediaCarouselProps): JSX.Element | null {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const swiperRef = useRef<SwiperInstance | null>(null);

  useEffect(() => {
    setActiveIndex(0);
    if (swiperRef.current) {
      const swiper = swiperRef.current;
      if (swiper.params.loop) {
        swiper.slideToLoop(0, 0);
      } else {
        swiper.slideTo(0, 0);
      }
    }
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
  const lightboxItems: DownloadableMedia[] = useMemo(
    () => mapPostMediasToDownloadables(post),
    [post],
  );
  const lightboxMediaCount = lightboxItems.length;
  const hasLightboxMultiple = lightboxMediaCount > 1;
  useEffect(() => {
    setImageFailed(false);
    setImageLoading(Boolean(currentMediaSrc));
  }, [currentMediaSrc, post.id]);

  const goToPrevious = useCallback(() => {
    if (!hasMultiplePhotos) {
      return;
    }
    if (swiperRef.current) {
      swiperRef.current.slidePrev();
      return;
    }
    setActiveIndex((prev) => (prev - 1 + mediaCount) % mediaCount);
  }, [hasMultiplePhotos, mediaCount]);

  const goToNext = useCallback(() => {
    if (!hasMultiplePhotos) {
      return;
    }
    if (swiperRef.current) {
      swiperRef.current.slideNext();
      return;
    }
    setActiveIndex((prev) => (prev + 1) % mediaCount);
  }, [hasMultiplePhotos, mediaCount]);

  const handleOpenLightbox = useCallback(() => {
    setLightboxStartIndex(activeIndex);
    setLightboxOpen(true);
  }, [activeIndex]);

  const handleSlideClick = useCallback(() => {
    const swiper = swiperRef.current as (SwiperInstance & { allowClick?: boolean }) | null;
    if (swiper && swiper.allowClick === false) {
      return;
    }
    handleOpenLightbox();
  }, [handleOpenLightbox]);

  const syncMainCarousel = useCallback(() => {
    if (!swiperRef.current) {
      return;
    }
    const swiper = swiperRef.current;
    const currentIndex = swiper.params.loop ? swiper.realIndex : swiper.activeIndex;
    if (currentIndex === activeIndex) {
      return;
    }
    if (swiper.params.loop) {
      swiper.slideToLoop(activeIndex, 0);
    } else {
      swiper.slideTo(activeIndex, 0);
    }
  }, [activeIndex]);

  useEffect(() => {
    if (lightboxOpen) {
      return;
    }
    syncMainCarousel();
  }, [lightboxOpen, syncMainCarousel]);

  const handleImageLoad = useCallback(
    (index?: number) => {
      if (index === undefined || index === activeIndex) {
        setImageLoading(false);
      }
    },
    [activeIndex],
  );

  const handleImageError = useCallback(
    (index?: number) => {
      if (index === undefined || index === activeIndex) {
        setImageFailed(true);
        setImageLoading(false);
      }
    },
    [activeIndex],
  );

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
    if (!businessBadge) {
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
            className="h-64 w-full cursor-pointer object-cover"
            onLoad={() => handleImageLoad()}
            onError={() => handleImageError()}
            onClick={handleOpenLightbox}
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
      <div className="relative overflow-hidden rounded-lg border border-border/60">
        {renderTopBadges()}
        <div className="relative h-64 w-full overflow-hidden">
          <Swiper
            modules={[A11y]}
            loop={hasMultiplePhotos}
            dir={isRTL ? 'rtl' : 'ltr'}
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            onSlideChange={(swiper) => {
              setActiveIndex(swiper.realIndex);
            }}
            className="size-full"
            allowTouchMove={hasMultiplePhotos}
          >
            {post.medias.map((media, index) => (
              <SwiperSlide key={media.id}>
                <img
                  src={resolveMediaSrc(media, post.imageUrl)}
                  alt={resolveMediaAlt(media, post.title, post.externalId)}
                  className="size-full cursor-pointer select-none object-cover"
                  draggable={false}
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                  onClick={handleSlideClick}
                />
              </SwiperSlide>
            ))}
        </Swiper>
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
          className="flex h-dvh w-dvw max-w-none items-center justify-center overflow-hidden rounded-none bg-black p-0"
        >
          <DialogTitle className="sr-only">{fullScreenLabel}</DialogTitle>
          <div className="relative flex size-full items-center justify-center">
            <DialogClose className="absolute right-4 top-4 z-20 inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
              <X className="size-5" aria-hidden />
            </DialogClose>
            {lightboxMediaCount > 0 ? (
              <Swiper
                modules={[Navigation, Zoom, Keyboard, A11y, Mousewheel]}
                loop={hasLightboxMultiple}
                initialSlide={lightboxStartIndex}
                onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
                zoom={{ maxRatio: 3, minRatio: 1 }}
                navigation
                keyboard={{ enabled: true }}
                mousewheel={{ forceToAxis: false, releaseOnEdges: true, thresholdDelta: 10 }}
                className="size-full"
              >
                {lightboxItems.map((media) => (
                  <SwiperSlide key={media.id}>
                    <div className="flex h-dvh items-center justify-center">
                      <div className="swiper-zoom-container">
                        <img
                          src={resolveMediaSrc(media, post.imageUrl)}
                          alt={resolveMediaAlt(media, post.title, post.externalId)}
                          className="max-h-[88vh] max-w-[92vw] object-contain"
                        />
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : null}
            {hasLightboxMultiple ? (
              <>
                <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                  {activeIndex + 1} / {lightboxMediaCount}
                </span>
              </>
            ) : null}
            <DialogClose
              className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm transition hover:bg-white/25 sm:hidden ${
                isRTL ? 'right-4' : 'left-4'
              }`}
            >
              <X className="size-4" aria-hidden />
              <span>{t('close')}</span>
            </DialogClose>
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
                  onClick={() => {
                    if (swiperRef.current) {
                      const swiper = swiperRef.current;
                      if (swiper.params.loop) {
                        swiper.slideToLoop(index);
                      } else {
                        swiper.slideTo(index);
                      }
                    } else {
                      setActiveIndex(index);
                    }
                  }}
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
        </>
      ) : null}
    </div>
  );
}
