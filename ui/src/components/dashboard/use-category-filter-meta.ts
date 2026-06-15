'use client';

import { useMemo } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';

import { useGetPublicDivarCategoryFilterQuery } from '@/features/api/endpoints/divar-category-filters';
import type { FilterOption } from './active-filter-badges-utils';
import { isRecord, getString, resolveWidgetLabel, getOptions } from './active-filter-badges-utils';

type CategoryFilterMeta = {
  labels: Record<string, string>;
  optionsByKey: Record<string, FilterOption[]>;
};

export function useCategoryFilterMeta(
  categoryFilterSlug: string | null,
): CategoryFilterMeta {
  const { data: categoryFilterDetail } = useGetPublicDivarCategoryFilterQuery(
    categoryFilterSlug ?? skipToken,
  );
  const normalizedCategoryOptions = useMemo(
    () => categoryFilterDetail?.normalizedOptions ?? {},
    [categoryFilterDetail],
  );

  const meta = useMemo(() => {
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

  return meta;
}
