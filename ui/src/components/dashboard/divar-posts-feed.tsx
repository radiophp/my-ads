/* eslint-disable @next/next/no-img-element */
'use client';

import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Loader2, Store, Tag, UserRound } from 'lucide-react';
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
import { DownloadPhotosDialog } from '@/components/dashboard/divar-posts/download-photos-dialog';
import { serializeCategoryFilterValues } from '@/components/dashboard/divar-posts/helpers';
import { PostCard } from '@/components/dashboard/divar-posts/post-card';
import { PostMediaCarousel } from '@/components/dashboard/divar-posts/post-media-carousel';
import {
  AmenitiesSection,
  AttributeLabelGrid,
  AttributeValueGrid,
  InfoRowSection,
  PriceSummaryRow,
  EXCLUDED_ATTRIBUTE_LABELS,
  buildFeaturedDetailEntries,
  buildInfoRowEntries,
} from '@/components/dashboard/divar-posts/post-detail-sections';
import type { DetailEntry } from '@/types/divar-posts-feed';

export function DivarPostsFeed(): JSX.Element {
  const t = useTranslations('dashboard.posts');
  const locale = useLocale();
  const isRTL = ['fa', 'ar', 'he'].includes(locale);
  const [posts, setPosts] = useState<DivarPostSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [selectedPost, setSelectedPost] = useState<DivarPostSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
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
  const selectedDescriptionLines = selectedPost?.description
    ? selectedPost.description.split('\n')
    : null;
  const selectedAttributes =
    selectedPost?.attributes && selectedPost.attributes.length > 0
      ? selectedPost.attributes
      : null;
  const formatAttributeValue = useCallback(
    (attribute: NonNullable<typeof selectedAttributes>[number]): string | null => {
      const normalizedString = attribute.stringValue?.trim();
      if (normalizedString) {
        return normalizedString;
      }
      if (typeof attribute.numberValue === 'number' && !Number.isNaN(attribute.numberValue)) {
        const formatted = numberFormatter.format(attribute.numberValue);
        return attribute.unit ? `${formatted} ${attribute.unit}` : formatted;
      }
      if (typeof attribute.boolValue === 'boolean') {
        return attribute.boolValue ? t('labels.booleanYes') : t('labels.booleanNo');
      }
      if (typeof attribute.rawValue === 'string' && attribute.rawValue.trim().length > 0) {
        return attribute.rawValue.trim();
      }
      if (attribute.rawValue !== null && attribute.rawValue !== undefined) {
        try {
          return JSON.stringify(attribute.rawValue);
        } catch (error) {
          console.warn('Failed to stringify attribute rawValue', error);
        }
      }
      return null;
    },
    [numberFormatter, t],
  );
  const attributeValueEntries: { id: string; label: string; value: string }[] = [];
  const attributeLabelOnlyEntries: { id: string; label: string }[] = [];
  if (selectedAttributes && selectedAttributes.length > 0) {
    const seenValueKeys = new Set<string>();
    const seenLabelKeys = new Set<string>();
    selectedAttributes.forEach((attribute, index) => {
      const label = attribute.label?.trim() || attribute.key;
      const value = formatAttributeValue(attribute);
      if (!label || !value) {
        return;
      }
      const id = attribute.id ?? `${attribute.key}-${index}`;
      const normalizedLabel = label;
      const normalizedValue = value;
      const isLabelOnly = normalizedLabel === normalizedValue;
      if (isLabelOnly) {
        if (!seenLabelKeys.has(normalizedLabel)) {
          attributeLabelOnlyEntries.push({ id, label: normalizedLabel });
          seenLabelKeys.add(normalizedLabel);
        }
      } else {
        const key = `${normalizedLabel}|${normalizedValue}`;
        if (seenValueKeys.has(key) || EXCLUDED_ATTRIBUTE_LABELS.has(normalizedLabel)) {
          return;
        }
        seenValueKeys.add(key);
        attributeValueEntries.push({ id, label: normalizedLabel, value: normalizedValue });
      }
    });
    attributeLabelOnlyEntries.sort((a, b) => a.label.length - b.label.length);
  }

  if (selectedPost && typeof selectedPost.isRebuilt === 'boolean') {
    const rebuildLabel = `${t('labels.isRebuilt')} ${
      selectedPost.isRebuilt ? t('labels.booleanYes') : t('labels.booleanNo')
    }`;
    if (!attributeLabelOnlyEntries.some((entry) => entry.label === rebuildLabel)) {
      attributeLabelOnlyEntries.push({
        id: 'detail-isRebuilt',
        label: rebuildLabel,
      });
      attributeLabelOnlyEntries.sort((a, b) => a.label.length - b.label.length);
    }
  }

  const detailEntries = useMemo<DetailEntry[]>(() => {
    if (!selectedPost) {
      return [];
    }

    const entries: DetailEntry[] = [];
    let counter = 0;

    const addEntry = (labelKey: string, value?: string | null) => {
      if (!value || value.trim().length === 0) {
        return;
      }
      entries.push({
        id: `${labelKey}-${counter++}`,
        labelKey,
        label: t(labelKey),
        value: value.trim(),
      });
    };

    const addPriceEntry = (labelKey: string, amount?: number | null) => {
      const formatted = formatPrice(amount ?? null);
      if (formatted) {
        addEntry(labelKey, formatted);
      }
    };

    const formatLabeledValue = (
      labelValue?: string | null,
      numericValue?: number | null,
      fallback?: (value: number) => string,
    ): string | null => {
      const trimmed = labelValue?.trim();
      if (trimmed) {
        return trimmed;
      }
      if (typeof numericValue === 'number' && !Number.isNaN(numericValue)) {
        if (fallback) {
          return fallback(numericValue);
        }
        return numberFormatter.format(numericValue);
      }
      return null;
    };

    addPriceEntry('labels.price', selectedPost.priceTotal);
    addPriceEntry('labels.pricePerSquare', selectedPost.pricePerSquare);
    addPriceEntry('labels.depositAmount', selectedPost.depositAmount);
    addPriceEntry('labels.rent', selectedPost.rentAmount);
    addPriceEntry('labels.dailyRateNormal', selectedPost.dailyRateNormal);
    addPriceEntry('labels.dailyRateWeekend', selectedPost.dailyRateWeekend);
    addPriceEntry('labels.dailyRateHoliday', selectedPost.dailyRateHoliday);
    addPriceEntry('labels.extraPersonFee', selectedPost.extraPersonFee);

    addEntry(
      'labels.area',
      formatLabeledValue(selectedPost.areaLabel, selectedPost.area, (value) =>
        t('areaLabel', { value }),
      ),
    );
    addEntry(
      'labels.landArea',
      formatLabeledValue(selectedPost.landAreaLabel, selectedPost.landArea),
    );
    addEntry(
      'labels.rooms',
      formatLabeledValue(selectedPost.roomsLabel, selectedPost.rooms),
    );
    addEntry(
      'labels.floor',
      formatLabeledValue(selectedPost.floorLabel, selectedPost.floor),
    );
    addEntry('labels.floorsCount', formatLabeledValue(null, selectedPost.floorsCount));
    addEntry('labels.unitPerFloor', formatLabeledValue(null, selectedPost.unitPerFloor));
    addEntry(
      'labels.yearBuilt',
      formatLabeledValue(selectedPost.yearBuiltLabel, selectedPost.yearBuilt),
    );
    addEntry(
      'labels.capacity',
      formatLabeledValue(selectedPost.capacityLabel, selectedPost.capacity),
    );

    return entries;
  }, [formatPrice, numberFormatter, selectedPost, t]);

  const featuredDetailEntries = useMemo(
    () => buildFeaturedDetailEntries(detailEntries),
    [detailEntries],
  );
  const infoRowEntries = useMemo(() => buildInfoRowEntries(detailEntries), [detailEntries]);
  const featuredKeys = useMemo(
    () => new Set(featuredDetailEntries.map((entry) => entry.labelKey)),
    [featuredDetailEntries],
  );
  const infoKeys = useMemo(
    () => new Set(infoRowEntries.map((entry) => entry.labelKey)),
    [infoRowEntries],
  );
  const secondaryDetailEntries = useMemo(
    () =>
      detailEntries.filter(
        (entry) => !featuredKeys.has(entry.labelKey) && !infoKeys.has(entry.labelKey),
      ),
    [detailEntries, featuredKeys, infoKeys],
  );

  const openPostModal = (post: DivarPostSummary) => {
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
      onSelect={openPostModal}
      getBusinessBadge={getBusinessTypeBadge}
      formatPrice={formatPrice}
      getRelativeLabel={getRelativeLabel}
      dateFormatter={dateFormatter}
    />
  );

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
        <DialogContent
          hideCloseButton
          className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:flex sm:max-h-[90vh] sm:w-full sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-col sm:overflow-hidden sm:rounded-2xl sm:border sm:p-6"
        >
          {selectedPost ? (
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
                  <DialogTitle className="flex flex-wrap items-center gap-2 break-words">
                    {selectedPost.title ?? t('untitled', { externalId: selectedPost.externalId })}
                  </DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="size-4" aria-hidden />
                    {selectedPost.categorySlug}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 sm:p-0">
                <div className="space-y-4">
                  <PostMediaCarousel
                    post={selectedPost}
                    isRTL={isRTL}
                    businessBadge={selectedBusinessBadge}
                    cityDistrict={selectedCityDistrict}
                    publishedDisplay={selectedPublishedDisplay}
                    hasDownloadableMedia={hasDownloadableMedia}
                    onRequestDownload={handleOpenDownloadDialog}
                    t={t}
                  />
                  <PriceSummaryRow
                    detailEntries={detailEntries}
                    entries={featuredDetailEntries}
                    isRTL={isRTL}
                  />
                  <AmenitiesSection post={selectedPost} t={t} />
                  <InfoRowSection detailEntries={detailEntries} entries={infoRowEntries} />

                  <dl className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                    {secondaryDetailEntries.map((entry) => (
                      <div key={entry.id}>
                        <dt className="font-medium text-foreground">{entry.label}</dt>
                        <dd className="text-muted-foreground">{entry.value}</dd>
                      </div>
                    ))}
                    {selectedDescriptionLines ? (
                      <div className="col-span-full space-y-1">
                        <dt className="font-medium text-foreground">{t('labels.description')}</dt>
                        <dd className="break-words text-sm text-muted-foreground">
                          {selectedDescriptionLines.map((line, index) => (
                            <span key={`description-line-${index}`}>
                              {line || '\u00A0'}
                              {index < selectedDescriptionLines.length - 1 ? <br /> : null}
                            </span>
                          ))}
                        </dd>
                      </div>
                    ) : null}
                    <AttributeValueGrid entries={attributeValueEntries} />
                    <AttributeLabelGrid entries={attributeLabelOnlyEntries} />
                  </dl>
                </div>
              </div>

              <div className="border-t border-border bg-background/95 px-6 py-4 sm:border-0 sm:bg-transparent sm:px-0">
                <div
                  className={`flex flex-wrap gap-3 ${
                    isRTL
                      ? 'flex-row-reverse sm:justify-start'
                      : 'flex-row sm:justify-end'
                  }`}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-w-[140px] flex-1 sm:flex-none"
                    onClick={() => closeDialog(false)}
                  >
                    {t('close')}
                  </Button>
                  <Button asChild className="min-w-[140px] flex-1 sm:flex-none">
                    <a
                      href={
                        selectedPost.permalink ?? `https://divar.ir/v/${selectedPost.externalId}`
                      }
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
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DownloadPhotosDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        post={selectedPost}
        isRTL={isRTL}
        t={t}
      />
    </Card>
  );
}
