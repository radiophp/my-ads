'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { DivarPostSummary } from '@/types/divar-posts';
import { PostCard } from '@/components/dashboard/divar-posts/post-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PostDetailView } from '@/components/dashboard/divar-posts/post-detail-view';
import { buildPostDetailData } from '@/components/dashboard/divar-posts/post-detail-data';
import { getBusinessTypeBadge } from '@/components/dashboard/divar-posts/business-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import 'swiper/css';

type HomeFeaturedPostsProps = {
  posts: DivarPostSummary[];
  title: string;
  description: string;
  emptyLabel: string;
};

export function HomeFeaturedPosts({
  posts,
  title,
  description: _description,
  emptyLabel,
}: HomeFeaturedPostsProps) {
  const locale = useLocale();
  const t = useTranslations('dashboard.posts');
  const isRTL = locale === 'fa';
  const [selectedPost, setSelectedPost] = useState<DivarPostSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const hasNavigation = posts.length > 1;
  const hasLoop = posts.length > 3;
  const prevClass = 'home-featured-posts-prev';
  const nextClass = 'home-featured-posts-next';

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );

  const relativeFormatter = useMemo(
    () =>
      new Intl.RelativeTimeFormat(locale, {
        numeric: 'auto',
      }),
    [locale],
  );

  const getRelativeLabel = useCallback(
    (iso: string | null | undefined, fallbackJalali?: string | null) => {
      if (iso) {
        const date = new Date(iso);
        const diffMs = date.getTime() - Date.now();
        const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
          { amount: 60, unit: 'second' },
          { amount: 60, unit: 'minute' },
          { amount: 24, unit: 'hour' },
          { amount: 7, unit: 'day' },
          { amount: 4.34524, unit: 'week' },
          { amount: 12, unit: 'month' },
          { amount: Number.POSITIVE_INFINITY, unit: 'year' },
        ];

        let duration = diffMs / 1000;
        for (const division of divisions) {
          if (Math.abs(duration) < division.amount) {
            return relativeFormatter.format(Math.round(duration), division.unit);
          }
          duration /= division.amount;
        }
      }

      if (fallbackJalali) {
        return fallbackJalali;
      }

      return null;
    },
    [relativeFormatter],
  );

  const formatPrice = useCallback(
    (value: number | string | null | undefined): string | null => {
      const numeric =
        typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : null;
      if (numeric === null || Number.isNaN(numeric) || numeric <= 0) {
        return null;
      }
      return currencyFormatter.format(numeric);
    },
    [currencyFormatter],
  );

  const handleSelect = useCallback((post: DivarPostSummary) => {
    setSelectedPost(post);
    setDialogOpen(true);
  }, []);

  const handleDialogChange = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedPost(null);
    }
  }, []);

  const numberFormatter = currencyFormatter;
  const selectedBusinessBadge = useMemo(
    () => (selectedPost ? getBusinessTypeBadge(selectedPost.businessType ?? null, t) : null),
    [selectedPost, t],
  );
  const selectedPublishedDisplay = selectedPost
    ? selectedPost.publishedAt
      ? dateFormatter.format(new Date(selectedPost.publishedAt))
      : (selectedPost.publishedAtJalali ?? t('labels.notAvailable'))
    : null;
  const selectedCityDistrict =
    selectedPost && (selectedPost.districtName || selectedPost.cityName)
      ? [selectedPost.districtName, selectedPost.cityName].filter(Boolean).join('، ')
      : null;
  const hasDownloadableMedia = Boolean(
    selectedPost && (selectedPost.medias.length > 0 || selectedPost.imageUrl),
  );
  const detailData = useMemo(() => {
    if (!selectedPost) {
      return null;
    }
    return buildPostDetailData({
      post: selectedPost,
      t,
      formatPrice,
      numberFormatter,
    });
  }, [selectedPost, t, formatPrice, numberFormatter]);

  if (!posts.length) {
    return (
      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-10">
      <div className="grid grid-cols-[auto,1fr,auto] items-center gap-2 sm:gap-4">
        <div className="flex justify-start">
          <button
            type="button"
            className={cn(
              'bg-card/80 hover:bg-card inline-flex size-10 items-center justify-center rounded-full border border-border/70 text-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40',
              prevClass,
            )}
            aria-label="Previous"
            disabled={!hasNavigation}
          >
            {isRTL ? (
              <ChevronRight className="size-4" aria-hidden />
            ) : (
              <ChevronLeft className="size-4" aria-hidden />
            )}
          </button>
        </div>
        <div className="min-w-0 text-center">
          <h2 className="truncate text-[13px] font-semibold leading-snug text-foreground sm:text-lg">
            {title}
          </h2>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className={cn(
              'bg-card/80 hover:bg-card inline-flex size-10 items-center justify-center rounded-full border border-border/70 text-foreground shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40',
              nextClass,
            )}
            aria-label="Next"
            disabled={!hasNavigation}
          >
            {isRTL ? (
              <ChevronLeft className="size-4" aria-hidden />
            ) : (
              <ChevronRight className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>
      <Swiper
        modules={[Autoplay, Navigation]}
        autoplay={{ delay: 7000, disableOnInteraction: false }}
        loop={hasLoop}
        navigation={{ prevEl: `.${prevClass}`, nextEl: `.${nextClass}` }}
        dir={isRTL ? 'rtl' : 'ltr'}
        spaceBetween={16}
        breakpoints={{
          0: { slidesPerView: 1 },
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
        }}
        className="home-featured-posts-swiper w-full"
      >
        {posts.map((post) => (
          <SwiperSlide key={post.id} className="flex h-full">
            <div className="flex size-full">
              <PostCard
                post={post}
                t={t}
                formatPrice={formatPrice}
                getRelativeLabel={getRelativeLabel}
                dateFormatter={dateFormatter}
                onSelect={handleSelect}
                showCategoryBreadcrumb
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <style jsx global>{`
        .home-featured-posts-swiper .swiper-wrapper {
          align-items: stretch;
        }
        .home-featured-posts-swiper .swiper-slide {
          height: auto;
        }
      `}</style>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent
          hideCloseButton
          className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:flex sm:max-h-[90vh] sm:w-full sm:max-w-[1200px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-col sm:overflow-hidden sm:rounded-2xl sm:p-8"
        >
          {selectedPost && detailData ? (
            <div className="flex h-full flex-col overflow-hidden">
              <div className="border-b border-border px-6 py-4 sm:hidden">
                <p
                  className={`break-words text-base font-semibold ${isRTL ? 'text-right' : 'text-center'}`}
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  {selectedPost.title ?? t('untitled', { externalId: selectedPost.externalId })}
                </p>
              </div>
              <div className="hidden p-0 sm:block">
                <DialogHeader>
                  <DialogTitle className="mb-4 flex flex-wrap items-center gap-2 break-words">
                    {selectedPost.title ?? t('untitled', { externalId: selectedPost.externalId })}
                  </DialogTitle>
                </DialogHeader>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 sm:p-0">
                <PostDetailView
                  post={selectedPost}
                  t={t}
                  isRTL={isRTL}
                  businessBadge={selectedBusinessBadge}
                  cityDistrict={selectedCityDistrict}
                  publishedDisplay={selectedPublishedDisplay}
                  hasDownloadableMedia={hasDownloadableMedia}
                  onRequestDownload={() => undefined}
                  detailData={detailData}
                  mapWrapperClassName="lg:px-4"
                />
              </div>
              <div className="border-t border-border bg-background/95 px-6 py-4 sm:border-0 sm:bg-transparent sm:px-0">
                <div
                  className={cn(
                    'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end',
                    isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row',
                  )}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-w-[140px] flex-1 sm:flex-none"
                    onClick={() => handleDialogChange(false)}
                  >
                    {t('close')}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
