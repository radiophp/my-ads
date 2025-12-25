'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

import type { DivarPostSummary } from '@/types/divar-posts';
import { useAppSelector } from '@/lib/hooks';
import { PreviewPostsGrid } from '@/components/preview/preview-posts-grid';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhoneOtpLoginForm } from '@/components/auth/phone-otp-login-form';
import { PostDetailView } from '@/components/dashboard/divar-posts/post-detail-view';
import { buildPostDetailData } from '@/components/dashboard/divar-posts/post-detail-data';
import { getBusinessTypeBadge } from '@/components/dashboard/divar-posts/business-badge';
import { cn } from '@/lib/utils';

type PreviewPostsSectionProps = {
  posts: DivarPostSummary[];
  emptyLabel: string;
};

export function PreviewPostsSection({ posts, emptyLabel }: PreviewPostsSectionProps) {
  const locale = useLocale();
  const t = useTranslations('preview');
  const tPosts = useTranslations('dashboard.posts');
  const isRTL = locale === 'fa';
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.accessToken));
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedPost, setSelectedPost] = useState<DivarPostSummary | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  const handleSelect = useCallback(
    (post: DivarPostSummary) => {
      setSelectedPost(post);
      if (isAuthenticated) {
        setDetailOpen(true);
      } else {
        setShowLoginPrompt(true);
      }
    },
    [isAuthenticated],
  );

  const handleDetailChange = useCallback((open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      setSelectedPost(null);
    }
  }, []);

  const handleLoginPromptChange = useCallback(
    (open: boolean) => {
      setShowLoginPrompt(open);
      if (!open && !isAuthenticated) {
        setSelectedPost(null);
      }
    },
    [isAuthenticated],
  );

  useEffect(() => {
    if (showLoginPrompt && isAuthenticated) {
      setShowLoginPrompt(false);
      if (selectedPost) {
        setDetailOpen(true);
      }
    }
  }, [showLoginPrompt, isAuthenticated, selectedPost]);

  const selectedBusinessBadge = useMemo(
    () => (selectedPost ? getBusinessTypeBadge(selectedPost.businessType ?? null, tPosts) : null),
    [selectedPost, tPosts],
  );
  const selectedPublishedDisplay = selectedPost
    ? selectedPost.publishedAt
      ? dateFormatter.format(new Date(selectedPost.publishedAt))
      : (selectedPost.publishedAtJalali ?? tPosts('labels.notAvailable'))
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
      t: tPosts,
      formatPrice,
      numberFormatter: currencyFormatter,
    });
  }, [selectedPost, tPosts, formatPrice, currencyFormatter]);

  return (
    <>
      <PreviewPostsGrid
        posts={posts}
        emptyLabel={emptyLabel}
        onSelect={handleSelect}
      />
      <Dialog open={detailOpen} onOpenChange={handleDetailChange}>
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
                  {selectedPost.title ?? tPosts('untitled', { externalId: selectedPost.externalId })}
                </p>
              </div>
              <div className="hidden p-0 sm:block">
                <DialogHeader>
                  <DialogTitle className="mb-4 flex flex-wrap items-center gap-2 break-words">
                    {selectedPost.title ?? tPosts('untitled', { externalId: selectedPost.externalId })}
                  </DialogTitle>
                </DialogHeader>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4 sm:p-0">
                <PostDetailView
                  post={selectedPost}
                  t={tPosts}
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
                    onClick={() => handleDetailChange(false)}
                  >
                    {tPosts('close')}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showLoginPrompt} onOpenChange={handleLoginPromptChange}>
        <DialogContent
          hideCloseButton
          className="h-dvh w-screen max-w-none rounded-none p-0 sm:h-auto sm:max-w-lg sm:rounded-lg"
        >
          <div className="flex h-full flex-col">
            <VisuallyHidden>
              <DialogTitle>{t('loginTitle')}</DialogTitle>
            </VisuallyHidden>
            <div className="flex-1 overflow-y-auto">
              <PhoneOtpLoginForm />
            </div>
            <div className="border-t border-border/70 p-4 sm:border-t-0 sm:px-6 sm:pb-6">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setShowLoginPrompt(false)}
                >
                  {t('loginClose')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
