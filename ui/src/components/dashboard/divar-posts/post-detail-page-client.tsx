'use client';

import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useGetDivarPostQuery } from '@/features/api/apiSlice';
import { DownloadPhotosDialog } from '@/components/dashboard/divar-posts/download-photos-dialog';
import { buildPostDetailData } from '@/components/dashboard/divar-posts/post-detail-data';
import { PostDetailView } from '@/components/dashboard/divar-posts/post-detail-view';
import { getBusinessTypeBadge } from '@/components/dashboard/divar-posts/business-badge';

type PostDetailPageClientProps = {
  postId?: string | null;
};

export function PostDetailPageClient({ postId }: PostDetailPageClientProps): JSX.Element {
  const t = useTranslations('dashboard.posts');
  const locale = useLocale();
  const isRTL = ['fa', 'ar', 'he'].includes(locale);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const params = useParams<{ id?: string | string[] }>();
  const routeParamId = useMemo(() => {
    const value = params?.id;
    if (!value) {
      return null;
    }
    return Array.isArray(value) ? value[0] ?? null : value;
  }, [params?.id]);
  const effectivePostId = postId ?? routeParamId ?? null;
  const { data: post, isLoading, isFetching, isError } = useGetDivarPostQuery(
    effectivePostId ?? '',
    { skip: !effectivePostId },
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
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
    (value: number | null | undefined): string | null => {
      if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
        return null;
      }
      return currencyFormatter.format(value);
    },
    [currencyFormatter],
  );

  const detailData = useMemo(() => {
    if (!post) {
      return null;
    }
    return buildPostDetailData({
      post,
      t,
      formatPrice,
      numberFormatter,
    });
  }, [post, t, formatPrice, numberFormatter]);

  const businessBadge = useMemo(
    () => (post ? getBusinessTypeBadge(post.businessType ?? null, t) : null),
    [post, t],
  );

  const publishedDisplay = useMemo(() => {
    if (!post) {
      return null;
    }
    if (post.publishedAt) {
      return dateFormatter.format(new Date(post.publishedAt));
    }
    return post.publishedAtJalali ?? t('labels.notAvailable');
  }, [post, dateFormatter, t]);

  const cityDistrict = useMemo(() => {
    if (!post) {
      return null;
    }
    if (post.districtName || post.cityName) {
      return [post.districtName, post.cityName].filter(Boolean).join('، ');
    }
    return null;
  }, [post]);

  const hasDownloadableMedia = Boolean(post && (post.medias.length > 0 || post.imageUrl));

  const handleRequestDownload = useCallback(() => {
    if (hasDownloadableMedia) {
      setDownloadDialogOpen(true);
    }
  }, [hasDownloadableMedia]);

  useEffect(() => {
    setDownloadDialogOpen(false);
  }, [post?.id]);

  const renderBody = (): JSX.Element => {
    if (!effectivePostId) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/80 p-10 text-center text-muted-foreground">
          <p>{t('detailLoadFailed')}</p>
          <Button asChild variant="outline">
            <Link href="/dashboard">{t('backToDashboard')}</Link>
          </Button>
        </div>
      );
    }

    if (isLoading || isFetching) {
      return (
        <div className="flex flex-1 items-center justify-center py-24">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span>{t('loading')}</span>
          </div>
        </div>
      );
    }

    if (isError || !post || !detailData) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/80 p-10 text-center text-muted-foreground">
          <p>{t('detailLoadFailed')}</p>
          <Button asChild variant="outline">
            <Link href="/dashboard">{t('backToDashboard')}</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="break-words text-2xl font-semibold text-foreground">
            {post.title ?? t('untitled', { externalId: post.externalId })}
          </h1>
        </div>
        <div className="bg-card rounded-2xl border border-border/70 p-4 shadow-sm sm:p-6">
          <PostDetailView
            post={post}
            t={t}
            isRTL={isRTL}
            businessBadge={businessBadge}
            cityDistrict={cityDistrict}
            publishedDisplay={publishedDisplay}
            hasDownloadableMedia={hasDownloadableMedia}
            onRequestDownload={handleRequestDownload}
            detailData={detailData}
          />
        </div>
        <div
          className={`flex flex-wrap gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'} sm:justify-end`}
        >
          <Button asChild variant="secondary" className="min-w-[160px]">
            <Link href="/dashboard">{t('backToDashboard')}</Link>
          </Button>
          <Button asChild className="min-w-[160px]">
            <a
              href={post.permalink ?? `https://divar.ir/v/${post.externalId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2"
            >
              {t('openOnDivar')}
              <ExternalLink className="size-4" aria-hidden />
            </a>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <main className="w-full px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col">{renderBody()}</div>
      </main>
      <DownloadPhotosDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        post={post ?? null}
        isRTL={isRTL}
        t={t}
      />
    </>
  );
}
