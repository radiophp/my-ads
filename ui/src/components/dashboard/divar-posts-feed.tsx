/* eslint-disable @next/next/no-img-element */
'use client';

import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Clock3, ExternalLink, Loader2, MapPin, Store, Tag, UserRound } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useLazyGetDivarPostsQuery } from '@/features/api/apiSlice';
import type { DivarPostSummary } from '@/types/divar-posts';
import { useAppSelector } from '@/lib/hooks';
import type { CategoryFilterValue } from '@/features/search-filter/searchFilterSlice';

export function DivarPostsFeed(): JSX.Element {
  const t = useTranslations('dashboard.posts');
  const locale = useLocale();
  const [posts, setPosts] = useState<DivarPostSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [selectedPost, setSelectedPost] = useState<DivarPostSummary | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchPosts] = useLazyGetDivarPostsQuery();
  const {
    provinceId,
    citySelection,
    districtSelection,
    categorySelection,
    categoryFilters,
  } = useAppSelector(
    (state) => state.searchFilter,
  );
  const categorySlug = categorySelection.slug;
  const categoryDepth = categorySelection.depth;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

  const categoryFilterPayload = useMemo(() => {
    if (!categorySelection.slug) {
      return undefined;
    }
    const activeFilters = categoryFilters[categorySelection.slug];
    if (!activeFilters) {
      return undefined;
    }
    return serializeCategoryFilterValues(activeFilters);
  }, [categorySelection.slug, categoryFilters]);

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
    };
  }, [
    provinceId,
    cityFilterIds,
    districtFilterIds,
    categorySlug,
    categoryDepth,
    categoryFilterPayload,
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
    (value: number | null | undefined): string | null => {
      if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
        return null;
      }
      return currencyFormatter.format(value);
    },
    [currencyFormatter],
  );

  const getBusinessTypeBadge = useCallback(
    (value: string | null) => {
      if (!value) {
        return null;
      }
      const normalized = value.trim().toLowerCase();
      const realtorValues = new Set(['real-estate-business', 'real-estate', 'premium-panel']);
      if (realtorValues.has(normalized)) {
        return {
          label: t('businessType.realEstateBusiness'),
          className: 'bg-black/70',
          icon: <Store className="size-3.5" aria-hidden />,
        };
      }
      if (normalized === 'personal') {
        return {
          label: t('businessType.personal'),
          className: 'bg-black/70',
          icon: <UserRound className="size-3.5" aria-hidden />,
        };
      }
      return null;
    },
    [t],
  );

  const selectedBusinessBadge = selectedPost
    ? getBusinessTypeBadge(selectedPost.businessType ?? null)
    : null;

  const openPostModal = (post: DivarPostSummary) => {
    setSelectedPost(post);
    setActiveMediaIndex(0);
    setDialogOpen(true);
  };

  const closeDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedPost(null);
      setActiveMediaIndex(0);
    }
  };

  const renderPostCard = (post: DivarPostSummary) => {
    const publishedLabel = getRelativeLabel(post.publishedAt, post.publishedAtJalali);
    const priceLabel = formatPrice(post.priceTotal);
    const rentLabel = formatPrice(post.rentAmount);
    const pricePerSquareLabel = formatPrice(post.pricePerSquare);
    const publishedText = publishedLabel ?? dateFormatter.format(new Date(post.createdAt));
    const mediaCountLabel = t('mediaCount', { count: post.mediaCount ?? 0 });
    const businessBadge = getBusinessTypeBadge(post.businessType ?? null);

    return (
      <article
        key={post.id}
        className="bg-card flex h-full cursor-pointer flex-col gap-3 rounded-xl border border-border/70 p-4 shadow-sm transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        role="button"
        tabIndex={0}
        onClick={() => openPostModal(post)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPostModal(post);
          }
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="-mx-4 -mt-4 overflow-hidden rounded-t-xl">
            <div className="relative">
              {businessBadge ? (
                <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                  {businessBadge.icon}
                  {businessBadge.label}
                </span>
              ) : null}
              {post.imageUrl ? (
                <div className="relative h-48 w-full bg-muted">
                  <img
                    src={post.imageUrl}
                    alt={post.title ?? post.externalId}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="relative flex h-48 w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                  {t('noImage')}
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap gap-2 text-xs font-medium text-white">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5">
                  <Clock3 className="size-3.5" aria-hidden />
                  {publishedText}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5">
                  <Camera className="size-3.5" aria-hidden />
                  {mediaCountLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <div className="flex flex-col gap-2">
              <div>
                <h3 className="text-base font-semibold text-foreground sm:text-lg">
                  {post.title ?? t('untitled', { externalId: post.externalId })}
                </h3>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 text-foreground">
                <MapPin className="size-4" aria-hidden />
                {post.cityName}
                {post.districtName ? `، ${post.districtName}` : null}
                {post.provinceName ? `، ${post.provinceName}` : null}
              </span>
              {post.area ? (
                <span>{t('areaLabel', { value: post.area })}</span>
              ) : null}
              {priceLabel ? (
                <span>{t('priceLabel', { value: priceLabel })}</span>
              ) : null}
              {rentLabel ? (
                <span>{t('rentLabel', { value: rentLabel })}</span>
              ) : null}
              {pricePerSquareLabel ? (
                <span>{t('labels.pricePerSquare', { value: pricePerSquareLabel })}</span>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="space-y-4">
        {initializing ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-xl border border-border/60 bg-muted/40"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            {t('empty')}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
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
        <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-0 sm:p-6">
          {selectedPost ? (
            <>
              <DialogHeader className="px-6 pt-6">
                <DialogTitle className="flex items-center gap-2">
                  {selectedPost.title ?? t('untitled', { externalId: selectedPost.externalId })}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="size-4" aria-hidden />
                  {selectedPost.categorySlug}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 px-6 pb-6">
                {selectedPost.medias.length > 0 ? (
                  <div className="space-y-2">
                    <div className="relative overflow-hidden rounded-lg border border-border/60">
                      {selectedBusinessBadge ? (
                        <span
                          className={`pointer-events-none absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg ${selectedBusinessBadge.className}`}
                        >
                          {selectedBusinessBadge.label}
                        </span>
                      ) : null}
                      <img
                        src={
                          selectedPost.medias[activeMediaIndex]?.url ?? selectedPost.imageUrl ?? ''
                        }
                        alt={
                          selectedPost.medias[activeMediaIndex]?.alt ??
                          selectedPost.title ??
                          selectedPost.externalId
                        }
                        className="h-64 w-full object-cover"
                      />
                    </div>
                    {selectedPost.medias.length > 1 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedPost.medias.map((media, index) => (
                          <button
                            key={media.id}
                            type="button"
                            onClick={() => setActiveMediaIndex(index)}
                            className={`shrink-0 overflow-hidden rounded-md border ${
                              index === activeMediaIndex
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
                    ) : null}
                  </div>
                ) : selectedPost.imageUrl ? (
                  <div className="relative overflow-hidden rounded-lg border border-border/60">
                    {selectedBusinessBadge ? (
                      <span
                        className={`pointer-events-none absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg ${selectedBusinessBadge.className}`}
                      >
                        {selectedBusinessBadge.label}
                      </span>
                    ) : null}
                    <img
                      src={selectedPost.imageUrl}
                      alt={selectedPost.title ?? selectedPost.externalId}
                      className="h-64 w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {selectedPost.publishedAt
                      ? dateFormatter.format(new Date(selectedPost.publishedAt))
                      : (selectedPost.publishedAtJalali ?? t('labels.notAvailable'))}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {t('mediaCount', { count: selectedPost.mediaCount })}
                  </span>
                </div>
                <dl className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-foreground">{t('labels.location')}</dt>
                    <dd>
                      {selectedPost.cityName}
                      {selectedPost.districtName ? `، ${selectedPost.districtName}` : null}
                      {selectedPost.provinceName ? `، ${selectedPost.provinceName}` : null}
                    </dd>
                  </div>
                  {selectedPost.priceTotal ? (
                    <div>
                      <dt className="font-medium text-foreground">{t('labels.price')}</dt>
                      <dd>{formatPrice(selectedPost.priceTotal)}</dd>
                    </div>
                  ) : null}
                  {selectedPost.rentAmount ? (
                    <div>
                      <dt className="font-medium text-foreground">{t('labels.rent')}</dt>
                      <dd>{formatPrice(selectedPost.rentAmount)}</dd>
                    </div>
                  ) : null}
                  {selectedPost.area ? (
                    <div>
                      <dt className="font-medium text-foreground">{t('labels.area')}</dt>
                      <dd>{t('areaLabel', { value: selectedPost.area })}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="font-medium text-foreground">{t('labels.createdAt')}</dt>
                    <dd>{dateFormatter.format(new Date(selectedPost.createdAt))}</dd>
                  </div>
                  {selectedPost.pricePerSquare ? (
                    <div>
                      <dt className="font-medium text-foreground">{t('labels.pricePerSquare')}</dt>
                      <dd>{formatPrice(selectedPost.pricePerSquare)}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="font-medium text-foreground">{t('labels.externalId')}</dt>
                    <dd className="font-mono text-xs">{selectedPost.externalId}</dd>
                  </div>
                  {selectedPost.permalink ? (
                    <div className="col-span-full">
                      <dt className="font-medium text-foreground">{t('labels.permalink')}</dt>
                      <dd>
                        <a
                          href={selectedPost.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {selectedPost.permalink}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="secondary" onClick={() => closeDialog(false)}>
                    {t('close')}
                  </Button>
                  <Button asChild>
                    <a
                      href={
                        selectedPost.permalink ?? `https://divar.ir/v/${selectedPost.externalId}`
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('openOnDivar')}
                      <ExternalLink className="ml-2 size-4" aria-hidden />
                    </a>
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function serializeCategoryFilterValues(
  filters: Record<string, CategoryFilterValue>,
): Record<string, unknown> | undefined {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (!value) {
      continue;
    }
    switch (value.kind) {
      case 'numberRange': {
        const range: Record<string, number> = {};
        if (isFiniteNumber(value.min)) {
          range.min = value.min;
        }
        if (isFiniteNumber(value.max)) {
          range.max = value.max;
        }
        if (Object.keys(range).length > 0) {
          payload[key] = range;
        }
        break;
      }
      case 'multiSelect':
        if (value.values.length > 0) {
          payload[key] = value.values;
        }
        break;
      case 'singleSelect':
        if (typeof value.value === 'string' && value.value.length > 0) {
          payload[key] = value.value;
        }
        break;
      case 'boolean':
        if (value.value === true) {
          payload[key] = true;
        }
        break;
      default:
        break;
    }
  }
  return Object.keys(payload).length > 0 ? payload : undefined;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
