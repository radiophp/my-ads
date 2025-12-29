'use client';

import { useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { skipToken } from '@reduxjs/toolkit/query';
import { X } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  useGetCitiesQuery,
  useGetDistrictsQuery,
  useGetProvincesQuery,
  useGetPublicDivarCategoriesQuery,
  useGetPublicDivarCategoryFilterQuery,
  useGetRingBinderFoldersQuery,
} from '@/features/api/apiSlice';
import {
  clearCategoryFilters,
  commitAppliedFilters,
  setCategoryFilterValue,
  setCategorySelection,
  setCitySelectionMode,
  setDistrictSelectionMode,
  setNoteFilter,
  setProvince,
  setRingBinderFolder,
  setSelectedCities,
  setSelectedDistricts,
  type CategoryFilterValue,
} from '@/features/search-filter/searchFilterSlice';
import { BASE_CATEGORY_SLUG } from '@/lib/divar-categories';
import { cn } from '@/lib/utils';

type FilterOption = { value: string; label: string };

type ActiveFilterBadgesProps = {
  className?: string;
};

type BadgeEntry = {
  key: string;
  label: string;
  kind:
    | 'category'
    | 'province'
    | 'city'
    | 'district'
    | 'ringBinder'
    | 'noteFilter'
    | 'categoryFilter';
  categorySlug?: string;
  filterKey?: string;
};

const WIDGET_LABEL_PREFIX = 'dashboard.filters.categoryFilters.widgetLabels.';
const WIDGET_LABEL_SHORT_PREFIX = 'categoryFilters.widgetLabels.';

function normalizeWidgetLabelKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith(WIDGET_LABEL_PREFIX)) {
    return trimmed.slice(WIDGET_LABEL_PREFIX.length);
  }
  if (trimmed.startsWith(WIDGET_LABEL_SHORT_PREFIX)) {
    return trimmed.slice(WIDGET_LABEL_SHORT_PREFIX.length);
  }
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(object: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!object) {
    return undefined;
  }
  const value = object[key];
  return typeof value === 'string' ? value : undefined;
}

function getOptions(
  data?: Record<string, unknown>,
  fallbackOptions?: FilterOption[],
): FilterOption[] {
  const options = Array.isArray(data?.['options']) ? data?.['options'] : [];
  const normalized = options
    .map((option) => {
      if (!isRecord(option)) {
        return null;
      }
      const value =
        getString(option, 'key') ??
        getString(option, 'value') ??
        getString(option, 'title') ??
        null;
      const label =
        getString(option, 'title') ??
        getString(option, 'display') ??
        getString(option, 'label') ??
        getString(option, 'value') ??
        null;
      if (!value || !label) {
        return null;
      }
      if (value === 'ALL_POSSIBLE_OPTIONS') {
        return null;
      }
      return { value, label };
    })
    .filter((option): option is FilterOption => Boolean(option));

  if (normalized.length > 0) {
    return normalized;
  }
  return fallbackOptions ?? [];
}

function resolveWidgetLabel(entry: Record<string, unknown>, data?: Record<string, unknown>) {
  return (
    getString(data, 'filter_page_title') ??
    getString(data, 'title') ??
    getString(data, 'bottom_sheet_title') ??
    getString(entry, 'uid') ??
    ''
  );
}

export function ActiveFilterBadges({ className }: ActiveFilterBadgesProps) {
  const t = useTranslations('dashboard.filters');
  const tFilterLabels = useTranslations('dashboard.filters.categoryFilters.widgetLabels');
  const locale = useLocale();
  const isRTL = ['fa', 'ar', 'he'].includes(locale);
  const dispatch = useAppDispatch();
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
  const categoryFilterSlug = categorySlug ?? Object.keys(categoryFilters)[0] ?? null;
  const selectedCityIds =
    citySelection.mode === 'custom' && citySelection.cityIds.length > 0
      ? citySelection.cityIds
      : [];

  const { data: provinces = [] } = useGetProvincesQuery();
  const { data: cities = [] } = useGetCitiesQuery(provinceId === null ? skipToken : provinceId);
  const { data: districts = [] } = useGetDistrictsQuery(
    selectedCityIds.length === 0
      ? skipToken
      : selectedCityIds.length === 1
        ? selectedCityIds[0]
        : selectedCityIds,
  );
  const { data: categories = [] } = useGetPublicDivarCategoriesQuery();
  const { data: ringBinderData } = useGetRingBinderFoldersQuery();
  const ringBinderFolders = useMemo(() => ringBinderData?.folders ?? [], [ringBinderData]);
  const { data: categoryFilterDetail } = useGetPublicDivarCategoryFilterQuery(
    categoryFilterSlug ?? skipToken,
  );
  const normalizedCategoryOptions = useMemo(
    () => categoryFilterDetail?.normalizedOptions ?? {},
    [categoryFilterDetail],
  );
  const categoryFilterMeta = useMemo(() => {
    const labels: Record<string, string> = {};
    const optionsByKey: Record<string, FilterOption[]> = {};
    const payload = categoryFilterDetail?.payload;
    if (!isRecord(payload)) {
      return { labels, optionsByKey };
    }
    const page = payload['page'];
    if (!isRecord(page)) {
      return { labels, optionsByKey };
    }
    const widgetList = page['widget_list'];
    if (!Array.isArray(widgetList)) {
      return { labels, optionsByKey };
    }
    widgetList.forEach((entry) => {
      if (!isRecord(entry)) {
        return;
      }
      const data = isRecord(entry['data']) ? entry['data'] : undefined;
      const field = isRecord(data?.['field']) ? data?.['field'] : undefined;
      const key = field ? getString(field, 'key') : undefined;
      if (!key) {
        return;
      }
      const label = resolveWidgetLabel(entry, data);
      if (label) {
        labels[key] = label;
      }
      const options = getOptions(data, normalizedCategoryOptions[key]);
      if (options.length > 0) {
        optionsByKey[key] = options;
      }
    });
    return { labels, optionsByKey };
  }, [categoryFilterDetail, normalizedCategoryOptions]);

  const selectedProvinceName =
    provinceId !== null ? provinces.find((province) => province.id === provinceId)?.name : null;
  const provinceButtonLabel =
    provinceId === null ? t('provinceAll') : selectedProvinceName ?? t('provinceButtonSelect');

  const selectedCityNames = useMemo(() => {
    if (citySelection.mode !== 'custom' || citySelection.cityIds.length === 0) {
      return [];
    }

    return citySelection.cityIds
      .map((id) => cities.find((city) => city.id === id)?.name)
      .filter((name): name is string => Boolean(name));
  }, [citySelection, cities]);

  const selectedDistrictNames = useMemo(() => {
    if (districtSelection.mode !== 'custom' || districtSelection.districtIds.length === 0) {
      return [];
    }

    return districtSelection.districtIds
      .map((id) => districts.find((district) => district.id === id)?.name)
      .filter((name): name is string => Boolean(name));
  }, [districtSelection, districts]);

  let cityButtonLabel = t('cityButtonSelect');
  if (selectedCityNames.length === 1) {
    cityButtonLabel = selectedCityNames[0];
  } else if (citySelection.mode === 'custom' && citySelection.cityIds.length > 0) {
    cityButtonLabel = t('cityButtonSelected', { count: citySelection.cityIds.length });
  }

  let districtButtonLabel = t('districtButtonSelect');
  if (selectedDistrictNames.length === 1) {
    districtButtonLabel = selectedDistrictNames[0];
  } else if (districtSelection.mode === 'custom' && districtSelection.districtIds.length > 0) {
    districtButtonLabel = t('districtButtonSelected', { count: districtSelection.districtIds.length });
  }

  const allowedCategories = useMemo(
    () => categories.filter((category) => category.allowPosting),
    [categories],
  );
  const baseCategory = useMemo(
    () => allowedCategories.find((category) => category.slug === BASE_CATEGORY_SLUG) ?? null,
    [allowedCategories],
  );
  const selectedCategory =
    categorySlug !== null
      ? allowedCategories.find((category) => category.slug === categorySlug) ?? null
      : null;
  const categorySummaryLabel = selectedCategory?.name ?? baseCategory?.name ?? t('categories.all');

  const formatNumber = useCallback(
    (value: number) => {
      try {
        return new Intl.NumberFormat(locale).format(value);
      } catch {
        return value.toString();
      }
    },
    [locale],
  );

  const formatCategoryFilterValue = useCallback(
    (value: CategoryFilterValue, options: Array<{ value: string; label: string }> = []) => {
      switch (value.kind) {
        case 'numberRange': {
          const min = typeof value.min === 'number' ? value.min : null;
          const max = typeof value.max === 'number' ? value.max : null;
          if (min === null && max === null) {
            return null;
          }
          if (min !== null && max !== null) {
            return isRTL
              ? `${formatNumber(min)} تا ${formatNumber(max)}`
              : `${formatNumber(min)} - ${formatNumber(max)}`;
          }
          if (min !== null) {
            return isRTL ? `از ${formatNumber(min)}` : `from ${formatNumber(min)}`;
          }
          return isRTL ? `تا ${formatNumber(max as number)}` : `to ${formatNumber(max as number)}`;
        }
        case 'multiSelect': {
          const values = value.values.filter((item) => item && item.length > 0);
          if (values.length === 0) {
            return null;
          }
          const labels = values.map(
            (val) => options.find((opt) => opt.value === val)?.label ?? val,
          );
          return labels.join(isRTL ? '، ' : ', ');
        }
        case 'singleSelect': {
          if (!value.value) {
            return null;
          }
          return options.find((opt) => opt.value === value.value)?.label ?? value.value;
        }
        case 'boolean': {
          return value.value ? t('badges.enabled') : null;
        }
        default:
          return null;
      }
    },
    [formatNumber, isRTL, t],
  );

  const badges = useMemo(() => {
    const resolveLabel = (key: string) => {
      const normalizedKey = normalizeWidgetLabelKey(key);
      const resolveFromTranslations = (translationKey: string) => {
        const candidate = normalizeWidgetLabelKey(translationKey);
        if (tFilterLabels.has(candidate)) {
          return tFilterLabels(candidate as never);
        }
        const prefixedCandidate = `filter_${candidate}`;
        if (tFilterLabels.has(prefixedCandidate)) {
          return tFilterLabels(prefixedCandidate as never);
        }
        return null;
      };
      const directTranslation =
        resolveFromTranslations(normalizedKey) ?? resolveFromTranslations(key);
      if (directTranslation) {
        return directTranslation;
      }
      const metaLabel = categoryFilterMeta.labels[normalizedKey] ?? categoryFilterMeta.labels[key];
      if (metaLabel) {
        const normalizedMeta = normalizeWidgetLabelKey(metaLabel);
        const metaTranslation = resolveFromTranslations(normalizedMeta);
        if (metaTranslation) {
          return metaTranslation;
        }
        if (normalizedMeta && normalizedMeta !== normalizedKey && normalizedMeta !== key) {
          return normalizedMeta;
        }
        if (metaLabel !== normalizedKey && metaLabel !== key) {
          return metaLabel;
        }
      }
      return normalizedKey;
    };

    const entries: BadgeEntry[] = [];
    if (categorySelection.slug) {
      entries.push({ key: 'category', label: categorySummaryLabel, kind: 'category' });
    }
    if (provinceId !== null) {
      entries.push({ key: 'province', label: provinceButtonLabel, kind: 'province' });
    }
    if (citySelection.mode === 'custom' && citySelection.cityIds.length > 0) {
      entries.push({ key: 'city', label: cityButtonLabel, kind: 'city' });
    }
    if (districtSelection.mode === 'custom' && districtSelection.districtIds.length > 0) {
      entries.push({ key: 'district', label: districtButtonLabel, kind: 'district' });
    }
    if (ringBinderFolderId) {
      const folderName = ringBinderFolders.find((folder) => folder.id === ringBinderFolderId)?.name;
      const label = folderName
        ? `${t('ringBinder.label')}: ${folderName}`
        : t('ringBinder.label');
      entries.push({ key: 'ringBinder', label, kind: 'ringBinder' });
    }
    if (noteFilter !== 'all') {
      entries.push({
        key: 'noteFilter',
        label: `${t('noteFilter.label')}: ${t(`noteFilter.options.${noteFilter}`)}`,
        kind: 'noteFilter',
      });
    }
    const seenCategoryFilters = new Set<string>();
    Object.entries(categoryFilters).forEach(([slug, bucket]) => {
      Object.entries(bucket).forEach(([key, value]) => {
        if (seenCategoryFilters.has(key)) {
          return;
        }
        seenCategoryFilters.add(key);
        const label = resolveLabel(key);
        const formattedValue = formatCategoryFilterValue(
          value,
          categoryFilterMeta.optionsByKey[key] ?? normalizedCategoryOptions[key] ?? [],
        );
        const badgeLabel = formattedValue ? `${label}: ${formattedValue}` : label;
        entries.push({
          key: `categoryFilter-${slug}-${key}`,
          label: badgeLabel,
          kind: 'categoryFilter',
          categorySlug: slug,
          filterKey: key,
        });
      });
    });
    return entries;
  }, [
    categoryFilters,
    categoryFilterMeta,
    categorySummaryLabel,
    cityButtonLabel,
    citySelection.cityIds.length,
    citySelection.mode,
    districtButtonLabel,
    districtSelection.districtIds.length,
    districtSelection.mode,
    formatCategoryFilterValue,
    normalizedCategoryOptions,
    noteFilter,
    provinceButtonLabel,
    provinceId,
    ringBinderFolderId,
    ringBinderFolders,
    t,
    tFilterLabels,
    categorySelection.slug,
  ]);

  const handleRemove = useCallback(
    (badge: BadgeEntry) => {
      let didChange = false;
      switch (badge.kind) {
        case 'category': {
          dispatch(setCategorySelection({ slug: null, depth: null }));
          Object.keys(categoryFilters).forEach((slug) => {
            dispatch(clearCategoryFilters({ slug }));
          });
          didChange = true;
          break;
        }
        case 'province':
          dispatch(setProvince(null));
          didChange = true;
          break;
        case 'city':
          dispatch(setSelectedCities([]));
          dispatch(setCitySelectionMode('all'));
          didChange = true;
          break;
        case 'district':
          dispatch(setSelectedDistricts([]));
          dispatch(setDistrictSelectionMode('all'));
          didChange = true;
          break;
        case 'ringBinder':
          dispatch(setRingBinderFolder(null));
          didChange = true;
          break;
        case 'noteFilter':
          dispatch(setNoteFilter('all'));
          didChange = true;
          break;
        case 'categoryFilter': {
          if (!badge.categorySlug || !badge.filterKey) {
            break;
          }
          dispatch(
            setCategoryFilterValue({
              slug: badge.categorySlug,
              key: badge.filterKey,
              value: null,
            }),
          );
          didChange = true;
          break;
        }
        default:
          break;
      }
      if (didChange) {
        dispatch(commitAppliedFilters());
      }
    },
    [categoryFilters, dispatch],
  );

  if (badges.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex w-full flex-wrap gap-2 text-[11px] sm:gap-3 sm:text-base',
        isRTL ? 'flex-row-reverse justify-end text-right [direction:rtl]' : 'justify-start text-left',
        className,
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {badges.map((badge) => (
        <span
          key={badge.key}
          className={cn(
            'inline-flex items-start gap-2 rounded-full bg-secondary/70 px-3 py-1.5 font-medium text-foreground sm:px-4 sm:py-2',
            isRTL ? 'text-right' : 'text-left',
          )}
        >
          <span className="block min-w-0 break-words leading-6">{badge.label}</span>
          <button
            type="button"
            onClick={() => handleRemove(badge)}
            className={cn(
              'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground',
            )}
            aria-label={t('clear')}
          >
            <X className="size-4" aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}
