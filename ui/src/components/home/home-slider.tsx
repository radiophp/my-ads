'use client';

import { Autoplay, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { ArrowUpRight } from 'lucide-react';

import type { Slide } from '@/types/slide';
import { Link } from '@/i18n/routing';
import { normalizeStorageUrl } from '@/lib/storage';
import { cn } from '@/lib/utils';

import 'swiper/css';
import 'swiper/css/pagination';

type HomeSliderProps = {
  slides: Slide[];
  locale: string;
  appBase?: string | null;
};

const isExternalUrl = (value: string) => /^https?:\/\//i.test(value);

export function HomeSlider({ slides, locale, appBase }: HomeSliderProps) {
  if (!slides.length) {
    return null;
  }

  const isRTL = locale === 'fa';

  return (
    <section className="w-full">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        loop={slides.length > 1}
        pagination={{ clickable: true }}
        dir={isRTL ? 'rtl' : 'ltr'}
        className="overflow-hidden rounded-3xl"
      >
        {slides.map((slide, index) => {
          const desktopImage = normalizeStorageUrl(slide.imageDesktopUrl, appBase ?? undefined);
          if (!desktopImage) {
            return null;
          }
          const tabletImage = normalizeStorageUrl(
            slide.imageTabletUrl || slide.imageDesktopUrl,
            appBase ?? undefined,
          );
          const mobileImage = normalizeStorageUrl(
            slide.imageMobileUrl || slide.imageTabletUrl || slide.imageDesktopUrl,
            appBase ?? undefined,
          );

          const wrapper = (
            <div className="relative h-48 w-full sm:h-64 lg:h-[360px]">
              <picture>
                {mobileImage ? (
                  <source media="(max-width: 640px)" srcSet={mobileImage} />
                ) : null}
                {tabletImage ? (
                  <source media="(max-width: 1024px)" srcSet={tabletImage} />
                ) : null}
                <img
                  src={desktopImage}
                  alt={slide.title || 'Slide'}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  className="absolute inset-0 size-full object-cover"
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-l from-black/10 via-black/30 to-black/70" />
              <div className="absolute inset-0 flex items-center">
                <div className="mx-auto flex w-full max-w-6xl px-6">
                  <div className="max-w-xl space-y-4 text-white">
                    {slide.linkUrl && slide.linkLabel ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                        {slide.linkLabel}
                        <ArrowUpRight className="size-4" aria-hidden />
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );

          if (!slide.linkUrl) {
            return <SwiperSlide key={slide.id}>{wrapper}</SwiperSlide>;
          }

          if (isExternalUrl(slide.linkUrl)) {
            return (
              <SwiperSlide key={slide.id}>
                <a href={slide.linkUrl} target="_blank" rel="noreferrer" className="block">
                  {wrapper}
                </a>
              </SwiperSlide>
            );
          }

          return (
            <SwiperSlide key={slide.id}>
              <Link href={slide.linkUrl} className={cn('block', isRTL && 'text-right')}>
                {wrapper}
              </Link>
            </SwiperSlide>
          );
        })}
      </Swiper>
      <style jsx global>{`
        .swiper-pagination-bullet {
          width: 10px;
          height: 10px;
          border-radius: 9999px;
          background: #ffffff;
          opacity: 0.9;
          border: 1px solid rgba(0, 0, 0, 0.6);
        }
        .swiper-pagination-bullet-active {
          opacity: 1;
          background: #ffffff;
          border-color: rgba(0, 0, 0, 0.85);
        }
      `}</style>
    </section>
  );
}
