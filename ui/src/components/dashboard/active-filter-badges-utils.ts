import type { CategoryFilterValue } from '@/features/search-filter/searchFilterSlice';

export type FilterOption = { value: string; label: string };

export type BadgeEntry = {
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

export function normalizeWidgetLabelKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith(WIDGET_LABEL_PREFIX)) {
    return trimmed.slice(WIDGET_LABEL_PREFIX.length);
  }
  if (trimmed.startsWith(WIDGET_LABEL_SHORT_PREFIX)) {
    return trimmed.slice(WIDGET_LABEL_SHORT_PREFIX.length);
  }
  return trimmed;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getString(object: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!object) {
    return undefined;
  }
  const value = object[key];
  return typeof value === 'string' ? value : undefined;
}

export function getOptions(
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

export function resolveWidgetLabel(entry: Record<string, unknown>, data?: Record<string, unknown>) {
  return (
    getString(data, 'filter_page_title') ??
    getString(data, 'title') ??
    getString(data, 'bottom_sheet_title') ??
    getString(entry, 'uid') ??
    ''
  );
}

export function formatCategoryFilterValue(
  value: CategoryFilterValue,
  options: Array<{ value: string; label: string }> = [],
  formatNumber: (v: number) => string,
  isRTL: boolean,
  t: (key: string) => string,
): string | null {
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
}
