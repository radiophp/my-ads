/* eslint-disable @next/next/no-img-element, tailwindcss/classnames-order */
'use client';

import type { JSX, TouchEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  ArrowUpDown,
  Camera,
  Car,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  Download,
  PanelsTopLeft,
  Store,
  Tag,
  UserRound,
  Warehouse,
  CheckCircle2,
  InfoIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

type AmenityKey = 'hasParking' | 'hasElevator' | 'hasWarehouse' | 'hasBalcony';

type AmenityConfig = {
  key: AmenityKey;
  icon: LucideIcon;
  labelKey: string;
};

const AMENITY_CONFIG: AmenityConfig[] = [
  { key: 'hasParking', icon: Car, labelKey: 'labels.hasParking' },
  { key: 'hasElevator', icon: ArrowUpDown, labelKey: 'labels.hasElevator' },
  { key: 'hasWarehouse', icon: Warehouse, labelKey: 'labels.hasWarehouse' },
  { key: 'hasBalcony', icon: PanelsTopLeft, labelKey: 'labels.hasBalcony' },
];

const PRIMARY_PRICE_KEYS = ['labels.price', 'labels.pricePerSquare'] as const;
const RENT_PRICE_KEYS = ['labels.depositAmount', 'labels.rent'] as const;
const FEATURED_DETAIL_KEYS = ['labels.price', 'labels.pricePerSquare', 'labels.area'] as const;
const isFeaturedDetailKey = (labelKey: string): boolean =>
  FEATURED_DETAIL_KEYS.includes(labelKey as (typeof FEATURED_DETAIL_KEYS)[number]);
const FEATURED_RTL_ORDER: Record<string, number> = {
  'labels.price': 0,
  'labels.area': 1,
  'labels.pricePerSquare': 2,
};
const EXCLUDED_ATTRIBUTE_LABELS = new Set(['آسانسور', 'پارکینگ', 'انباری']);
const INFO_ROW_KEYS = ['labels.rooms', 'labels.floor', 'labels.yearBuilt'] as const;
const isInfoRowKey = (labelKey: string): boolean =>
  INFO_ROW_KEYS.includes(labelKey as (typeof INFO_ROW_KEYS)[number]);
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL.length > 0
    ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '')
    : '/api';
const buildPhotoDownloadUrl = (postId: string): string =>
  `${API_BASE_URL}/divar-posts/${postId}/photos.zip`;

type DetailEntry = {
  id: string;
  labelKey: string;
  label: string;
  value: string | null;
};

type DownloadableMedia = {
  id: string;
  url: string | null;
  thumbnailUrl: string | null;
  alt: string | null;
};

const getMediaDownloadUrl = (
  media: DivarPostSummary['medias'][number] | DownloadableMedia,
): string | null => {
  if (!media) {
    return null;
  }
  const candidate =
    'localUrl' in media
      ? (media as DivarPostSummary['medias'][number] & { localUrl?: string | null }).localUrl
      : null;
  return candidate ?? media.url ?? null;
};

const resolveMediaSrc = (
  media: DivarPostSummary['medias'][number] | DownloadableMedia | null | undefined,
  fallback?: string | null,
): string => {
  if (!media) {
    return fallback ?? '';
  }
  if (
    'localUrl' in media &&
    typeof (media as { localUrl?: string | null }).localUrl === 'string' &&
    (media as { localUrl?: string | null }).localUrl
  ) {
    return (media as { localUrl?: string | null }).localUrl as string;
  }
  return media.url ?? fallback ?? '';
};

const resolveMediaAlt = (
  media: DivarPostSummary['medias'][number] | DownloadableMedia | null | undefined,
  fallbackTitle?: string | null,
  fallbackId?: string,
): string =>
  media?.alt ?? media?.id ?? fallbackTitle ?? fallbackId ?? 'post-media';

export function DivarPostsFeed(): JSX.Element {
  const t = useTranslations('dashboard.posts');
  const locale = useLocale();
  const isRTL = ['fa', 'ar', 'he'].includes(locale);
  const [posts, setPosts] = useState<DivarPostSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [selectedPost, setSelectedPost] = useState<DivarPostSummary | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [downloadingMediaId, setDownloadingMediaId] = useState<string | null>(null);
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
  const showThumbnailScrollHint = selectedPost ? selectedPost.medias.length > 3 : false;
  const selectedCityDistrict =
    selectedPost && (selectedPost.districtName || selectedPost.cityName)
      ? [selectedPost.districtName, selectedPost.cityName].filter(Boolean).join('، ')
      : null;
  const selectedMedias = selectedPost?.medias ?? [];
  const mediaCount = selectedMedias.length;
  const hasMultiplePhotos = mediaCount > 1;
  const currentMedia =
    mediaCount > 0 ? selectedMedias[activeMediaIndex % mediaCount] ?? selectedMedias[0] : null;
  const previousMedia = hasMultiplePhotos
    ? selectedMedias[(activeMediaIndex - 1 + mediaCount) % mediaCount]
    : null;
  const nextMedia = hasMultiplePhotos
    ? selectedMedias[(activeMediaIndex + 1) % mediaCount]
    : null;
  const singleMediaDownloadUrl =
    selectedMedias.length === 1
      ? getMediaDownloadUrl(selectedMedias[0]) ?? selectedPost?.imageUrl ?? null
      : null;
  const fallbackImageDownloadUrl =
    selectedMedias.length === 0 ? selectedPost?.imageUrl ?? null : null;
  const photoDownloadUrl = selectedPost
    ? hasMultiplePhotos
      ? buildPhotoDownloadUrl(selectedPost.id)
      : singleMediaDownloadUrl ?? fallbackImageDownloadUrl
    : null;
  const isZipDownload = Boolean(selectedPost && hasMultiplePhotos);
  const downloadMedias = useMemo<DownloadableMedia[]>(() => {
    if (!selectedPost) {
      return [];
    }
    if (selectedPost.medias.length > 0) {
      return selectedPost.medias.map((media) => {
        const enriched = media as typeof media & {
          localUrl?: string | null;
          localThumbnailUrl?: string | null;
        };
        return {
          id: media.id,
          url: enriched.localUrl ?? media.url ?? null,
          thumbnailUrl:
            enriched.localThumbnailUrl ??
            media.thumbnailUrl ??
            enriched.localUrl ??
            media.url ??
            null,
          alt: media.alt,
        };
      });
    }
    if (selectedPost.imageUrl) {
      return [
        {
          id: `${selectedPost.id}-fallback`,
          url: selectedPost.imageUrl,
          thumbnailUrl: selectedPost.imageUrl,
          alt: selectedPost.title ?? selectedPost.externalId ?? null,
        },
      ];
    }
    return [];
  }, [selectedPost]);
  const hasDownloadableMedia = downloadMedias.length > 0;
  const previousPhotoLabel = isRTL ? 'عکس قبلی' : 'Previous photo';
  const nextPhotoLabel = isRTL ? 'عکس بعدی' : 'Next photo';
  const PreviousIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;
  const [swipeDelta, setSwipeDelta] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const goToPreviousMedia = useCallback(() => {
    if (!hasMultiplePhotos || mediaCount === 0) {
      return;
    }
    setActiveMediaIndex((prev) => (prev - 1 + mediaCount) % mediaCount);
  }, [hasMultiplePhotos, mediaCount]);
  const goToNextMedia = useCallback(() => {
    if (!hasMultiplePhotos || mediaCount === 0) {
      return;
    }
    setActiveMediaIndex((prev) => (prev + 1) % mediaCount);
  }, [hasMultiplePhotos, mediaCount]);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeLastXRef = useRef<number | null>(null);
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
      goToPreviousMedia();
    } else {
      goToNextMedia();
    }
    setSwipeDelta(0);
  }, [goToNextMedia, goToPreviousMedia, hasMultiplePhotos]);
  const handleOpenDownloadDialog = useCallback(() => {
    if (!hasDownloadableMedia) {
      return;
    }
    setDownloadDialogOpen(true);
  }, [hasDownloadableMedia]);
  useEffect(() => {
    setDownloadDialogOpen(false);
    setDownloadingMediaId(null);
  }, [selectedPost]);

  const sanitizeFileName = useCallback((value: string): string => {
    if (!value) {
      return 'photo';
    }
    return value.replace(/[^a-zA-Z0-9-_]/g, '_');
  }, []);

  const handleSingleDownload = useCallback(
    async (media: DownloadableMedia, index: number) => {
      const downloadUrl = media.url;
      if (!downloadUrl) {
        console.warn('No download URL available for media', media.id);
        return;
      }
      try {
        setDownloadingMediaId(media.id);
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.status}`);
        }
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const label =
          media.alt ??
          selectedPost?.title ??
          selectedPost?.externalId ??
          `photo-${index + 1}`;
        const extensionMatch = downloadUrl.match(/\.(jpe?g|png|webp|gif|heic|heif)(?:\?|$)/i);
        const extension = extensionMatch ? extensionMatch[0].split('?')[0] : '.jpg';
        link.href = objectUrl;
        link.download = `${sanitizeFileName(label)}${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
      } catch (error) {
        console.error('Failed to download media', error);
      } finally {
        setDownloadingMediaId(null);
      }
    },
    [sanitizeFileName, selectedPost],
  );
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

  const amenityItems = useMemo(() => {
    if (!selectedPost) {
      return [];
    }

    return AMENITY_CONFIG.map((config) => {
      const value = selectedPost[config.key];
      if (typeof value !== 'boolean') {
        return null;
      }
      return {
        ...config,
        value,
      };
    }).filter(
      (item): item is AmenityConfig & { value: boolean } => item !== null,
    );
  }, [selectedPost]);

  const featuredDetailEntries = useMemo(() => {
    const featured = detailEntries.filter((entry) => isFeaturedDetailKey(entry.labelKey));
    const hasPrimaryPrices = featured.some((entry) => PRIMARY_PRICE_KEYS.includes(entry.labelKey as (typeof PRIMARY_PRICE_KEYS)[number]));
    const rentEntries = detailEntries.filter((entry) =>
      RENT_PRICE_KEYS.includes(entry.labelKey as (typeof RENT_PRICE_KEYS)[number]),
    );
    if (!hasPrimaryPrices && rentEntries.length > 0) {
      const areaEntry = featured.find((entry) => entry.labelKey === 'labels.area');
      return [...rentEntries, ...(areaEntry ? [areaEntry] : [])];
    }
    return featured;
  }, [detailEntries]);
  const infoRowEntries = useMemo(
    () =>
      INFO_ROW_KEYS.map((key) => detailEntries.find((entry) => entry.labelKey === key)).filter(
        (entry): entry is DetailEntry => Boolean(entry),
      ),
    [detailEntries],
  );
  const orderedFeaturedEntries = useMemo(() => {
    if (!isRTL) {
      return featuredDetailEntries;
    }
    return [...featuredDetailEntries].sort(
      (a, b) => (FEATURED_RTL_ORDER[a.labelKey] ?? 0) - (FEATURED_RTL_ORDER[b.labelKey] ?? 0),
    );
  }, [featuredDetailEntries, isRTL]);
  const featuredKeys = useMemo(
    () => new Set(featuredDetailEntries.map((entry) => entry.labelKey)),
    [featuredDetailEntries],
  );

  const secondaryDetailEntries = useMemo(
    () =>
      detailEntries.filter(
        (entry) => !featuredKeys.has(entry.labelKey) && !isInfoRowKey(entry.labelKey),
      ),
    [detailEntries, featuredKeys],
  );

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
                <h3 className="break-words text-base font-semibold text-foreground sm:text-lg">
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
                  {selectedPost.medias.length > 0 ? (
                    <div className="space-y-2">
                      <div
                        className="relative overflow-hidden rounded-lg border border-border/60"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        {(selectedBusinessBadge || photoDownloadUrl) ? (
                          <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-center text-xs font-medium text-white">
                            <div className="flex flex-1 justify-start">
                              {selectedBusinessBadge ? (
                                <span
                                  className={`pointer-events-none rounded-full px-3 py-1 text-xs font-medium text-white shadow-lg ${selectedBusinessBadge.className}`}
                                >
                                  {selectedBusinessBadge.label}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-1 justify-end">
                              {hasDownloadableMedia ? (
                                <button
                                  type="button"
                                  onClick={handleOpenDownloadDialog}
                                  className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white shadow-lg hover:bg-black/80"
                                >
                                  <Download className="size-3.5" aria-hidden />
                                  <span>{t('downloadPhotos')}</span>
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        <div className="relative h-64 w-full overflow-hidden">
                          {hasMultiplePhotos ? (
                            <img
                              src={resolveMediaSrc(
                                previousMedia,
                                selectedPost.medias[activeMediaIndex]?.url ?? selectedPost.imageUrl,
                              )}
                              alt={resolveMediaAlt(
                                previousMedia,
                                selectedPost.title,
                                selectedPost.externalId,
                              )}
                              className="absolute inset-0 size-full select-none object-cover"
                              draggable={false}
                              style={{
                                transform: `translateX(calc(-100% + ${swipeDelta}px))`,
                                transition: isSwiping ? 'none' : 'transform 200ms ease',
                                opacity: hasMultiplePhotos ? 1 : 0,
                              }}
                            />
                          ) : null}
                          <img
                            src={
                              resolveMediaSrc(
                                currentMedia,
                                selectedPost.medias[activeMediaIndex]?.url ?? selectedPost.imageUrl,
                              ) ?? ''
                            }
                            alt={resolveMediaAlt(
                              currentMedia,
                              selectedPost.title,
                              selectedPost.externalId,
                            )}
                            className="relative size-full select-none object-cover"
                            draggable={false}
                            style={{
                              transform: `translateX(${swipeDelta}px)`,
                              transition: isSwiping ? 'none' : 'transform 200ms ease',
                            }}
                          />
                          {hasMultiplePhotos ? (
                            <img
                              src={resolveMediaSrc(
                                nextMedia,
                                selectedPost.medias[activeMediaIndex]?.url ?? selectedPost.imageUrl,
                              )}
                              alt={resolveMediaAlt(
                                nextMedia,
                                selectedPost.title,
                                selectedPost.externalId,
                              )}
                              className="absolute inset-0 size-full select-none object-cover"
                              draggable={false}
                              style={{
                                transform: `translateX(calc(100% + ${swipeDelta}px))`,
                                transition: isSwiping ? 'none' : 'transform 200ms ease',
                                opacity: hasMultiplePhotos ? 1 : 0,
                              }}
                            />
                          ) : null}
                        </div>
                        {hasMultiplePhotos ? (
                          <>
                            <button
                              type="button"
                              onClick={goToPreviousMedia}
                              className="absolute left-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition hover:bg-black/80 sm:flex"
                              aria-label={previousPhotoLabel}
                            >
                              <PreviousIcon className="size-5" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={goToNextMedia}
                              className="absolute right-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition hover:bg-black/80 sm:flex"
                              aria-label={nextPhotoLabel}
                            >
                              <NextIcon className="size-5" aria-hidden />
                            </button>
                          </>
                        ) : null}
                        {(selectedPublishedDisplay || selectedCityDistrict) ? (
                          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-center text-xs font-medium text-white">
                            <div className="flex flex-1 justify-start">
                              {selectedCityDistrict ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5">
                                  <MapPin className="size-3.5" aria-hidden />
                                  {selectedCityDistrict}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex flex-1 justify-end">
                              {selectedPublishedDisplay ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5">
                                  <Clock3 className="size-3.5" aria-hidden />
                                  {selectedPublishedDisplay}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      {selectedPost.medias.length > 1 ? (
                        <>
                          <div className="relative">
                            <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 pr-8">
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
                            {showThumbnailScrollHint ? (
                              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : selectedPost.imageUrl ? (
                    <div
                      className="relative overflow-hidden rounded-lg border border-border/60"
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      {(selectedBusinessBadge || photoDownloadUrl) ? (
                        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-center text-xs font-medium text-white">
                          <div className="flex flex-1 justify-start">
                            {selectedBusinessBadge ? (
                              <span
                                className={`pointer-events-none rounded-full px-3 py-1 text-xs font-medium text-white shadow-lg ${selectedBusinessBadge.className}`}
                              >
                                {selectedBusinessBadge.label}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-1 justify-end">
                            {hasDownloadableMedia ? (
                              <button
                                type="button"
                                onClick={handleOpenDownloadDialog}
                                className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white shadow-lg hover:bg-black/80"
                              >
                                <Download className="size-3.5" aria-hidden />
                                <span>{t('downloadPhotos')}</span>
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      <img
                        src={selectedPost.imageUrl}
                        alt={selectedPost.title ?? selectedPost.externalId}
                        className="h-64 w-full object-cover"
                        style={{
                          transform: `translateX(${swipeDelta}px)`,
                          transition: isSwiping ? 'none' : 'transform 200ms ease',
                        }}
                      />
                      {(selectedPublishedDisplay || selectedCityDistrict) ? (
                        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex items-center text-xs font-medium text-white">
                          <div className="flex flex-1 justify-start">
                            {selectedCityDistrict ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5">
                                <MapPin className="size-3.5" aria-hidden />
                                {selectedCityDistrict}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-1 justify-end">
                            {selectedPublishedDisplay ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5">
                                <Clock3 className="size-3.5" aria-hidden />
                                {selectedPublishedDisplay}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                ) : null}
                  {showThumbnailScrollHint ? (
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 text-muted-foreground sm:hidden">
                        <ArrowLeftRight className="size-3.5" aria-hidden />
                        <span>{t('mediaScrollHint')}</span>
                      </div>
                    </div>
                  ) : null}
                  {orderedFeaturedEntries.length > 0 ? (
                    <div className="mb-4 flex w-full flex-nowrap gap-4">
                      {orderedFeaturedEntries.map((entry, index) => {
                        const flexClasses = index === 1 ? 'flex-1 sm:flex-[2]' : 'flex-1 sm:flex-[5]';
                        return (
                          <div
                            key={entry.id}
                            className={`flex flex-col items-center gap-2 text-center ${flexClasses}`}
                          >
                            <span className="text-xs text-muted-foreground">{entry.label}</span>
                            <div className="rounded-full border border-input px-4 py-2">
                              <span className="text-sm text-foreground">{entry.value}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {amenityItems.length > 0 ? (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-4">
                        {amenityItems.map((amenity) => {
                          const Icon = amenity.icon;
                          const statusClass = amenity.value ? 'text-emerald-600' : 'text-destructive';
                          return (
                            <div
                              key={amenity.key}
                              className="flex min-w-[70px] flex-1 flex-col items-center gap-2 text-center"
                            >
                              <div
                                className={`flex size-10 items-center justify-center rounded-full border ${
                                  amenity.value
                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                                    : 'border-destructive bg-destructive/10 text-destructive'
                                }`}
                              >
                                <Icon className="size-5" aria-hidden />
                              </div>
                              <div className={`flex items-center gap-1 text-sm ${statusClass}`}>
                                <span>{t(amenity.labelKey)}</span>
                                <span>
                                  {amenity.value ? t('labels.booleanYes') : t('labels.booleanNo')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {infoRowEntries.length > 0 ? (
                    <div className="mb-4 flex w-full flex-nowrap gap-4">
                      {infoRowEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex flex-1 flex-col items-center gap-2 text-center"
                        >
                          <span className="text-xs text-muted-foreground">{entry.label}</span>
                          <div className="rounded-full border border-input px-4 py-2">
                            <span className="text-sm text-foreground">{entry.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

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
                    {attributeValueEntries.length > 0 ? (
                      <div className="col-span-full">
                        <div className="grid gap-4 sm:grid-cols-3">
                          {attributeValueEntries.map((attribute) => (
                            <div
                              key={attribute.id}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              <InfoIcon className="size-4 text-emerald-600" aria-hidden />
                              <span className="text-foreground">
                                {attribute.label}: {attribute.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {attributeLabelOnlyEntries.length > 0 ? (
                      <div className="col-span-full">
                        <div className="grid gap-4 sm:grid-cols-3">
                          {attributeLabelOnlyEntries.map((attribute) => (
                            <div
                              key={attribute.id}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              <CheckCircle2 className="size-4 text-primary" aria-hidden />
                              <span className="text-foreground">{attribute.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
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

      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent
          hideCloseButton
          className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:flex sm:h-[90vh] sm:w-full sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-col sm:overflow-hidden sm:rounded-2xl sm:border sm:p-6"
        >
          <div className="flex h-full flex-col overflow-hidden">
            <div className="border-b border-border px-6 py-4 sm:hidden">
              <p className="text-center text-base font-semibold">{t('downloadPhotos')}</p>
            </div>
            <div className="hidden px-6 py-4 sm:block">
              <DialogHeader>
                <DialogTitle>{t('downloadPhotos')}</DialogTitle>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-4 pt-2 sm:px-6">
              {hasDownloadableMedia ? (
                <div className="grid grid-cols-3 gap-3 md:grid-cols-8 lg:grid-cols-12">
                  {downloadMedias.map((media, index) => {
                    const downloadUrl = getMediaDownloadUrl(media) ?? media.url ?? null;
                    const isDownloading = downloadingMediaId === media.id;
                    return (
                      <div
                        key={media.id ?? `download-media-${index}`}
                        className="flex flex-col gap-2"
                      >
                        <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border/80">
                          <img
                            src={media.thumbnailUrl ?? media.url ?? ''}
                            alt={resolveMediaAlt(
                              media,
                              selectedPost?.title,
                              selectedPost?.externalId,
                            )}
                            className="size-full object-cover"
                            draggable={false}
                          />
                        </div>
                        {downloadUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isDownloading}
                            className="flex items-center justify-center gap-1 text-xs"
                            onClick={() => {
                              void handleSingleDownload(media, index);
                            }}
                          >
                            <Download className="size-4" aria-hidden />
                            <span>
                              {isDownloading
                                ? t('downloadInProgress')
                                : t('downloadSingle')}
                            </span>
                          </Button>
                        ) : (
                          <span className="text-center text-xs text-muted-foreground">
                            {t('downloadUnavailable')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('downloadNoPhotos')}</p>
              )}
            </div>
            <div
              className={cn(
                'px-6 py-4 bg-background/95 border-t border-border',
                'sm:px-6 sm:bg-transparent sm:border-0',
              )}
            >
              <div
                className={cn(
                  'flex flex-col gap-3',
                  'sm:flex-row sm:flex-wrap',
                  isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row',
                )}
              >
                {isZipDownload && photoDownloadUrl ? (
                  <Button
                    className="flex flex-1 min-w-[140px] justify-center"
                    disabled={downloadingMediaId === 'zip'}
                    onClick={() => {
                      setDownloadingMediaId('zip');
                      const link = document.createElement('a');
                      link.href = photoDownloadUrl;
                      link.download = `${sanitizeFileName(
                        selectedPost?.externalId ?? selectedPost?.id ?? 'post',
                      )}-photos.zip`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      setTimeout(() => setDownloadingMediaId(null), 3000);
                    }}
                  >
                    {downloadingMediaId === 'zip' ? (
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    ) : (
                      <Download className="mr-2 size-4" aria-hidden />
                    )}
                    {downloadingMediaId === 'zip' ? t('downloadInProgress') : t('downloadAllZip')}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 min-w-[140px]"
                  onClick={() => setDownloadDialogOpen(false)}
                >
                  {t('close')}
                </Button>
              </div>
            </div>
          </div>
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
