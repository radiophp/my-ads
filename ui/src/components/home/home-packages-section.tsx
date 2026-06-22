'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { HomePackageCard } from '@/components/home/home-package-card';
import type { SubscriptionPackage } from '@/types/packages';

type HomePackagesSectionProps = {
  packages: SubscriptionPackage[];
  onActivate?: (pkg: SubscriptionPackage) => void;
  sectionClassName?: string;
};

const prevClass = 'packages-swiper-prev';
const nextClass = 'packages-swiper-next';

export function HomePackagesSection({ packages, onActivate, sectionClassName }: HomePackagesSectionProps) {
  const t = useTranslations('landing');

  if (packages.length === 0) return null;

  return (
    <section className={`mx-auto w-full max-w-6xl space-y-6 px-4 ${sectionClassName ?? ''}`}>
      <div className="flex items-center justify-center gap-4 md:hidden">
        <button
          type="button"
          className={`${prevClass} bg-card hover:bg-card/80 inline-flex size-10 items-center justify-center rounded-full border border-border/70 text-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40`}
          aria-label="Previous"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
        <h2 className="text-center text-2xl font-semibold text-foreground">
          {t('packages.title')}
        </h2>
        <button
          type="button"
          className={`${nextClass} bg-card hover:bg-card/80 inline-flex size-10 items-center justify-center rounded-full border border-border/70 text-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40`}
          aria-label="Next"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
      </div>
      <div className="hidden md:flex md:items-center md:justify-center">
        <h2 className="text-center text-2xl font-semibold text-foreground">
          {t('packages.title')}
        </h2>
      </div>
      <div className="relative overflow-hidden md:overflow-visible">
        <button
          type="button"
          className={`${prevClass} bg-card hover:bg-card/80 absolute left-0 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 text-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 md:-left-10 md:inline-flex`}
          aria-label="Previous"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <Swiper
          modules={[Navigation]}
          loop={packages.length > 3}
          navigation={{ prevEl: `.${prevClass}`, nextEl: `.${nextClass}` }}
          spaceBetween={16}
          breakpoints={{
            0: { slidesPerView: 1.1 },
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3.2 },
          }}
          className="home-packages-swiper w-full"
        >
          {packages.map((pkg) => (
            <SwiperSlide key={pkg.id} className="flex h-auto">
              <div className="size-full">
                <HomePackageCard pkg={pkg} onActivate={onActivate} />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <button
          type="button"
          className={`${nextClass} bg-card hover:bg-card/80 absolute right-0 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 text-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 md:-right-10 md:inline-flex`}
          aria-label="Next"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <style jsx global>{`
        .home-packages-swiper .swiper-wrapper {
          align-items: stretch;
        }
        .home-packages-swiper .swiper-slide {
          height: auto;
        }
      `}</style>
    </section>
  );
}
