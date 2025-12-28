/* eslint-disable @next/next/no-img-element */
'use client';

import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  useLazyGetDivarPostsQuery,
  useFetchPostPhoneMutation,
  useFetchPostContactInfoMutation,
} from '@/features/api/apiSlice';
import type { DivarPostContactInfo, DivarPostSummary } from '@/types/divar-posts';
import { useAppSelector } from '@/lib/hooks';
import { DownloadPhotosDialog } from '@/components/dashboard/divar-posts/download-photos-dialog';
import { serializeCategoryFilterValues } from '@/components/dashboard/divar-posts/helpers';
import { PostCard } from '@/components/dashboard/divar-posts/post-card';
import { buildPostDetailData } from '@/components/dashboard/divar-posts/post-detail-data';
import { PostDetailView } from '@/components/dashboard/divar-posts/post-detail-view';
import { getBusinessTypeBadge } from '@/components/dashboard/divar-posts/business-badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { BASE_CATEGORY_SLUG } from '@/lib/divar-categories';

type ShareIconMap = {
  title: string;
  location: string;
  detail: string;
  description: string;
  link: string;
};

const SHARE_EMOJI_ICONS: ShareIconMap = {
  title: '🏷️',
  location: '📍',
  detail: '🔹',
  description: '📝',
  link: '🔗',
};

export function DivarPostsFeed(): JSX.Element {
  const t = useTranslations('dashboard.posts');
  const headerT = useTranslations('header');
  const locale = useLocale();
  const isRTL = ['fa', 'ar', 'he'].includes(locale);
  const { toast } = useToast();
  const [posts, setPosts] = useState<DivarPostSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [selectedPost, setSelectedPost] = useState<DivarPostSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [mapReady, setMapReady] = useState(true);
  const [fetchPosts] = useLazyGetDivarPostsQuery();
  const [fetchPhone] = useFetchPostPhoneMutation();
  const [fetchContactInfo] = useFetchPostContactInfoMutation();
  const [contactInfo, setContactInfo] = useState<DivarPostContactInfo | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const {
    provinceId,
    citySelection,
    districtSelection,
    categorySelection,
    categoryFilters,
    ringBinderFolderId,
    noteFilter,
  } = useAppSelector((state) => state.searchFilter);
  const categorySlug = categorySelection.slug;
  const categoryDepth = categorySelection.depth;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const selectedIndex = useMemo(
    () => (selectedPost ? posts.findIndex((post) => post.id === selectedPost.id) : -1),
    [posts, selectedPost],
  );
  const hasPrevious = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < posts.length - 1;
  const hasLocationForPost = useCallback(
    (post: DivarPostSummary | null) =>
      Boolean(
        post && typeof post.latitude === 'number' && typeof post.longitude === 'number',
      ),
    [],
  );

  const cityFilterIds = useMemo(() => {
    if (citySelection.mode !== 'custom') {
      return undefined;
    }
    return citySelection.cityIds.length > 0 ? [...citySelection.cityIds] : undefined;
  }, [citySelection.mode, citySelection.cityIds]);

  const districtFilterIds = useMemo(() => {
    if (districtSelection.mode !== 'custom') {
      return undefined;
    }
    return districtSelection.districtIds.length > 0 ? [...districtSelection.districtIds] : undefined;
  }, [districtSelection.mode, districtSelection.districtIds]);

  const categoryFilterSlug = useMemo(() => {
    if (categorySelection.slug) {
      return categorySelection.slug;
    }
    if (categoryFilters[BASE_CATEGORY_SLUG]) {
      return BASE_CATEGORY_SLUG;
    }
    return null;
  }, [categorySelection.slug, categoryFilters]);

  const categoryFilterPayload = useMemo(() => {
    if (!categoryFilterSlug) {
      return undefined;
    }
    const activeFilters = categoryFilters[categoryFilterSlug];
    if (!activeFilters) {
      return undefined;
    }
    return serializeCategoryFilterValues(activeFilters);
  }, [categoryFilterSlug, categoryFilters]);

  const filterArgs = useMemo(() => {
    const normalizedProvince = typeof provinceId === 'number' ? provinceId : undefined;
    const normalizedCities =
      cityFilterIds && cityFilterIds.length > 0 ? [...cityFilterIds] : undefined;
    const normalizedDistricts =
      districtFilterIds && districtFilterIds.length > 0 ? [...districtFilterIds] : undefined;
    return {
      provinceId: normalizedProvince,
      cityIds: normalizedCities,
      districtIds: normalizedDistricts,
      categorySlug: categorySlug ?? undefined,
      categoryDepth: typeof categoryDepth === 'number' ? categoryDepth : undefined,
      filters: categoryFilterPayload,
      ringFolderId: ringBinderFolderId ?? undefined,
      noteFilter: noteFilter !== 'all' ? noteFilter : undefined,
    };
  }, [
    provinceId,
    cityFilterIds,
    districtFilterIds,
    categorySlug,
    categoryDepth,
    categoryFilterPayload,
    ringBinderFolderId,
    noteFilter,
  ]);

  useEffect(() => {
    let isMounted = true;
    setInitializing(true);
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);

    fetchPosts({
      cursor: null,
      provinceId: filterArgs.provinceId,
      cityIds: filterArgs.cityIds,
      districtIds: filterArgs.districtIds,
      categorySlug: filterArgs.categorySlug,
      categoryDepth: filterArgs.categoryDepth,
      filters: filterArgs.filters,
      ringFolderId: filterArgs.ringFolderId,
      noteFilter: filterArgs.noteFilter,
    })
      .unwrap()
      .then((result) => {
        if (!isMounted) {
          return;
        }
        setPosts(result.items);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      })
      .catch((error) => {
        console.error('Failed to load divar posts', error);
      })
      .finally(() => {
        if (isMounted) {
          setInitializing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchPosts, filterArgs]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const result = await fetchPosts({
        cursor: nextCursor,
        provinceId: filterArgs.provinceId,
        cityIds: filterArgs.cityIds,
        districtIds: filterArgs.districtIds,
        categorySlug: filterArgs.categorySlug,
        categoryDepth: filterArgs.categoryDepth,
        filters: filterArgs.filters,
        ringFolderId: filterArgs.ringFolderId,
        noteFilter: filterArgs.noteFilter,
      }).unwrap();
      setPosts((prev) => [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to load more posts', error);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPosts, nextCursor, loadingMore, hasMore, filterArgs]);

  useEffect(() => {
    if (!hasMore) {
      return;
    }
    const node = loadMoreRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [loadMore, hasMore]);

  useEffect(() => {
    setContactInfo(null);
    setContactLoading(false);
  }, [selectedPost?.id]);

  useEffect(() => {
    if (!selectedPost) {
      setMapReady(true);
      return;
    }
    const hasLocation =
      typeof selectedPost.latitude === 'number' && typeof selectedPost.longitude === 'number';
    setMapReady(!hasLocation);
  }, [selectedPost]);

  const scrollDetailToTop = useCallback(() => {
    const node = detailScrollRef.current;
    if (!node) {
      return;
    }
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      node.scrollTop = 0;
      return;
    }
    try {
      node.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      node.scrollTop = 0;
    }
  }, []);

  const handleNavigateByOffset = useCallback(
    (offset: number) => {
      if (selectedIndex < 0) {
        return;
      }
      const target = posts[selectedIndex + offset];
      if (!target) {
        return;
      }
      setMapReady(!hasLocationForPost(target));
      setSelectedPost(target);
      setDialogOpen(true);
      scrollDetailToTop();
    },
    [hasLocationForPost, posts, scrollDetailToTop, selectedIndex],
  );

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

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
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
  const handleOpenDownloadDialog = useCallback(() => {
    if (!hasDownloadableMedia) {
      return;
    }
    setDownloadDialogOpen(true);
  }, [hasDownloadableMedia]);
  useEffect(() => {
    setDownloadDialogOpen(false);
  }, [selectedPost]);
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

  const shareableDetailEntries = useMemo(() => {
    if (!detailData) {
      return [];
    }
    return [
      ...detailData.featuredDetailEntries,
      ...detailData.infoRowEntries,
      ...detailData.secondaryDetailEntries,
    ];
  }, [detailData]);

  const plainShareIcons = useMemo<typeof SHARE_EMOJI_ICONS>(
    () => ({
      title: '',
      location: '',
      detail: '',
      description: '',
      link: '',
    }),
    [],
  );

  const sharePayload = useMemo(() => {
    if (!selectedPost) {
      return null;
    }
    const title =
      selectedPost.title ?? t('untitled', { externalId: selectedPost.externalId });
    const origin =
      (typeof window !== 'undefined' && window.location.origin) ||
      process.env.NEXT_PUBLIC_APP_URL ||
      '';
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    const url = `${normalizedOrigin}/dashboard/posts/${selectedPost.id}`;

    const buildMessage = (icons: typeof SHARE_EMOJI_ICONS) => {
      const labelled = (icon: string, label: string, value: string) =>
        icon ? `${icon} ${label}: ${value}` : `${label}: ${value}`;
      const parts: string[] = [
        labelled(icons.title, t('shareMessageTitleLabel'), title),
      ];
      if (selectedPost.code) {
        parts.push(labelled(icons.detail, t('labels.postCode'), selectedPost.code.toString()));
      }
      const cityDistrict = selectedCityDistrict;
      if (typeof cityDistrict === 'string' && cityDistrict.length > 0) {
        parts.push(labelled(icons.location, t('shareMessageLocationLabel'), cityDistrict));
      }
      shareableDetailEntries.forEach((entry) => {
        if (typeof entry.value === 'string' && entry.value.length > 0) {
          parts.push(labelled(icons.detail, entry.label, entry.value));
        }
      });
      const description = selectedPost.description;
      if (typeof description === 'string' && description.length > 0) {
        parts.push(
          labelled(icons.description, t('shareMessageDescriptionLabel'), description),
        );
      }
      parts.push(labelled(icons.link, t('shareMessageLinkLabel'), url));
      return parts.join('\n');
    };

    const messageWithEmoji = buildMessage(SHARE_EMOJI_ICONS);
    const plainMessage = buildMessage(plainShareIcons);
    const smsHref = `sms:?body=${encodeURIComponent(plainMessage)}`;
    return {
      title,
      url,
      summary: messageWithEmoji,
      message: messageWithEmoji,
      whatsappMessage: plainMessage,
      smsHref,
    };
  }, [selectedPost, selectedCityDistrict, shareableDetailEntries, t, plainShareIcons]);

  const appendPhoneAndShare = useCallback(
    async (variant: 'telegram' | 'whatsapp' | 'copy') => {
      if (!sharePayload || !selectedPost) {
        return;
      }

      let phone: string | null = null;
      let fetchFailed = false;
      try {
        const result = await fetchPhone({ postId: selectedPost.id }).unwrap();
        phone = result.phoneNumber;
      } catch (error) {
        fetchFailed = true;
        console.warn('Failed to fetch phone for share', error);
      }

      if (fetchFailed) {
        const proceed = window.confirm(t('sharePhoneFallbackPrompt'));
        if (!proceed) {
          return;
        }
      }

      const phoneLine = phone ? `\n${t('sharePhoneLabel')}: ${phone}` : '';
      const message = `${sharePayload.message}${phoneLine}`;
      const plainMessage = `${sharePayload.whatsappMessage ?? sharePayload.message}${phoneLine}`;

      if (variant === 'telegram') {
        const url = `https://t.me/share/url?url=${encodeURIComponent(sharePayload.url)}&text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      } else if (variant === 'whatsapp') {
        const url = `https://wa.me/?text=${encodeURIComponent(plainMessage)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        navigator.clipboard
          .writeText(message)
          .then(() => {
            toast({
              title: t('copySuccessTitle'),
              description: t('copySuccessDescription'),
            });
          })
          .catch(() => {
            toast({
              title: t('copyErrorTitle'),
              description: t('copyErrorDescription'),
              variant: 'destructive',
            });
          });
      }
    },
    [fetchPhone, selectedPost, sharePayload, t, toast],
  );

  const handleShareWhatsapp = useCallback(() => {
    void appendPhoneAndShare('whatsapp');
  }, [appendPhoneAndShare]);

  const handleShareTelegram = useCallback(() => {
    void appendPhoneAndShare('telegram');
  }, [appendPhoneAndShare]);

  const handleCopyLink = useCallback(() => {
    void appendPhoneAndShare('copy');
  }, [appendPhoneAndShare]);

  const handleFetchContactInfo = useCallback(async () => {
    if (!selectedPost) {
      return;
    }
    setContactLoading(true);
    try {
      const result = await fetchContactInfo({ postId: selectedPost.id }).unwrap();
      setContactInfo(result);
      if (!result.phoneNumber) {
        toast({
          title: t('contactInfo.missingTitle'),
          description: t('contactInfo.missingDescription'),
        });
      }
    } catch (error: unknown) {
      const fetchError = error as {
        status?: number;
        originalStatus?: number;
        data?: { retryAfterSeconds?: number };
      };
      const status = fetchError?.status ?? fetchError?.originalStatus;
      if (status === 429) {
        const retrySeconds = Number(fetchError?.data?.retryAfterSeconds ?? 0);
        const minutes = Math.floor(retrySeconds / 60);
        const seconds = Math.max(retrySeconds % 60, 0);
        const timeLabel =
          minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, '0')}s` : `${seconds}s`;
        toast({
          title: t('contactInfo.rateLimitedTitle'),
          description: t('contactInfo.rateLimitedDescription', { time: timeLabel }),
          variant: 'destructive',
        });
      } else {
        console.error('Failed to fetch contact info', error);
        toast({
          title: t('contactInfo.errorTitle'),
          description: t('contactInfo.errorDescription'),
          variant: 'destructive',
        });
      }
    } finally {
      setContactLoading(false);
    }
  }, [fetchContactInfo, selectedPost, t, toast]);

  const openPostModal = (post: DivarPostSummary) => {
    setMapReady(!hasLocationForPost(post));
    setSelectedPost(post);
    setDialogOpen(true);
  };

  const closeDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedPost(null);
    }
  };

  const renderPostCard = (post: DivarPostSummary) => (
    <PostCard
      key={post.id}
      post={post}
      t={t}
      formatPrice={formatPrice}
      onSelect={openPostModal}
      getRelativeLabel={getRelativeLabel}
      dateFormatter={dateFormatter}
    />
  );

  return (
    <Card className="flex size-full flex-col overflow-hidden border-0 shadow-sm">
      <CardContent className="w-full min-w-0 flex-1 space-y-4 overflow-y-auto p-4">
        {initializing ? (
          <div className="grid w-full auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="size-full min-w-0">
                <PostCardSkeleton />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            {t('empty')}
          </div>
        ) : (
          <>
            <div className="grid w-full auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
              {posts.map((post) => renderPostCard(post))}
            </div>
            {hasMore ? (
              <div ref={loadMoreRef} className="flex justify-center py-4">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    <span>{t('loading')}</span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void loadMore();
                    }}
                  >
                    {t('loadMore')}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">{t('endOfFeed')}</p>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent
          hideCloseButton
          className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:flex sm:max-h-[90vh] sm:w-full sm:max-w-[1200px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-col sm:overflow-hidden sm:rounded-2xl sm:p-8"
          onPointerDownOutside={(event) => {
            if (downloadDialogOpen) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (downloadDialogOpen) {
              event.preventDefault();
            }
          }}
        >
          {selectedPost ? (
            <div className="flex h-full flex-col overflow-hidden">
              <div className="border-b border-border px-6 py-4 sm:hidden">
                <div
                  className={cn(
                    'flex w-full items-start gap-2 break-words text-sm font-semibold',
                    isRTL ? 'justify-start text-right' : 'justify-center text-center',
                  )}
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <img
                    src="/fav/android-chrome-192x192.png"
                    alt={headerT('brand')}
                    className="mt-0.5 size-6 shrink-0"
                  />
                  <span className={cn('break-words', isRTL && 'text-right')}>
                    {selectedPost.title ?? t('untitled', { externalId: selectedPost.externalId })}
                  </span>
                </div>
              </div>
              <div className="hidden p-0 sm:block">
                <DialogHeader>
                  <DialogTitle
                    className={cn(
                      'mb-4 flex w-full flex-wrap items-start gap-2 break-words text-base lg:text-lg',
                      isRTL ? 'justify-start text-right' : 'justify-start',
                    )}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <Image
                      src="/fav/android-chrome-192x192.png"
                      alt={headerT('brand')}
                      width={24}
                      height={24}
                      className="mt-0.5 size-6 shrink-0"
                    />
                    <span className={cn('break-words', isRTL && 'text-right')}>
                      {selectedPost.title ?? t('untitled', { externalId: selectedPost.externalId })}
                    </span>
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div ref={detailScrollRef} className="flex-1 overflow-y-auto px-6 py-4 sm:p-0">
                {detailData ? (
                  <>
                    <PostDetailView
                      post={selectedPost}
                      t={t}
                      isRTL={isRTL}
                      businessBadge={selectedBusinessBadge}
                      cityDistrict={selectedCityDistrict}
                      publishedDisplay={selectedPublishedDisplay}
                      hasDownloadableMedia={hasDownloadableMedia}
                      onRequestDownload={handleOpenDownloadDialog}
                      detailData={detailData}
                      onShareWhatsapp={sharePayload ? handleShareWhatsapp : undefined}
                      onShareTelegram={sharePayload ? handleShareTelegram : undefined}
                      smsHref={sharePayload?.smsHref ?? null}
                      onCopyLink={sharePayload ? handleCopyLink : undefined}
                      copyLinkLabel={t('copyLink')}
                      onRequestContactInfo={handleFetchContactInfo}
                      contactInfo={contactInfo}
                      contactLoading={contactLoading}
                      onMapReady={() => setMapReady(true)}
                      mapWrapperClassName="lg:px-4"
                    />
                    <div className={cn('mt-6 flex', isRTL ? 'justify-start' : 'justify-end')}>
                      <Button asChild variant="link" className="h-auto p-0 text-sm">
                        <a
                          href={
                            selectedPost.permalink ??
                            `https://divar.ir/v/${selectedPost.externalId}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2"
                        >
                          {t('openOnDivar')}
                          <ExternalLink className="size-4" aria-hidden />
                        </a>
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="border-t border-border bg-background/95 px-6 py-4 sm:border-0 sm:bg-transparent sm:px-0">
                <div
                  className={cn(
                    'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
                    isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row',
                  )}
                >
                  <div className={cn('flex flex-wrap gap-3', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'min-w-[140px] flex-1 sm:flex-none',
                        isRTL ? 'order-last' : 'order-first',
                      )}
                      onClick={() => handleNavigateByOffset(-1)}
                      disabled={!hasPrevious || !mapReady}
                    >
                      <span className="flex items-center gap-2">
                        {isRTL ? (
                          <ChevronRight className="size-4" aria-hidden />
                        ) : (
                          <ChevronLeft className="size-4" aria-hidden />
                        )}
                        {t('previousPost')}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'min-w-[140px] flex-1 sm:flex-none',
                        isRTL ? 'order-first' : 'order-last',
                      )}
                      onClick={() => handleNavigateByOffset(1)}
                      disabled={!hasNext || !mapReady}
                    >
                      <span className="flex items-center gap-2">
                        {t('nextPost')}
                        {isRTL ? (
                          <ChevronLeft className="size-4" aria-hidden />
                        ) : (
                          <ChevronRight className="size-4" aria-hidden />
                        )}
                      </span>
                    </Button>
                  </div>
                  <div className={cn('flex flex-wrap gap-3', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-w-[140px] flex-1 sm:flex-none"
                      onClick={() => closeDialog(false)}
                    >
                      {t('close')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DownloadPhotosDialog
        open={downloadDialogOpen}
        onOpenChange={(value) => {
          setDownloadDialogOpen(value);
        }}
        post={selectedPost}
        isRTL={isRTL}
        t={t}
      />
    </Card>
  );
}

function PostCardSkeleton() {
  return (
    <article className="bg-card flex size-full min-h-[360px] min-w-0 animate-pulse flex-col gap-3 overflow-hidden rounded-xl border border-border/70 p-4 shadow-sm">
      <div className="-mx-4 -mt-4 overflow-hidden rounded-t-xl">
        <div className="relative h-48 w-full bg-muted/60" />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex h-6 w-20 rounded-full bg-black/30" />
          <span className="inline-flex h-6 w-24 rounded-full bg-black/30" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 pt-1">
        <div className="h-4 w-3/4 rounded bg-muted/60" />
        <div className="h-4 w-24 rounded bg-muted/50" />
        <div className="flex flex-col gap-2 text-sm">
          <div className="h-3 w-2/3 rounded bg-muted/50" />
          <div className="h-3 w-1/2 rounded bg-muted/50" />
          <div className="h-3 w-1/3 rounded bg-muted/50" />
          <div className="h-3 w-1/4 rounded bg-muted/50" />
        </div>
      </div>
    </article>
  );
}
