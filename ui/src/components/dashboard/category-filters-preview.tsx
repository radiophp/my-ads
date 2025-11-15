'use client';

import { skipToken } from '@reduxjs/toolkit/query';
import { useMemo, type ReactNode } from 'react';
import { useTranslations, type TranslationValues } from 'next-intl';

import { useGetPublicDivarCategoryFilterQuery } from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import {
  clearCategoryFilters,
  setCategoryFilterValue,
} from '@/features/search-filter/searchFilterSlice';

type FilterOption = { value: string; label: string };

type BaseWidget = {
  id: string;
  label: string;
  description?: string;
  uid?: string;
};

type TitleWidget = BaseWidget & {
  kind: 'title';
};

type NumberRangeWidget = BaseWidget & {
  kind: 'numberRange';
  key: string;
  unit?: string;
};

type MultiSelectWidget = BaseWidget & {
  kind: 'multiSelect';
  key: string;
  options: FilterOption[];
  layout: 'chips' | 'list';
};

type SingleSelectWidget = BaseWidget & {
  kind: 'singleSelect';
  key: string;
  options: FilterOption[];
  clearable: boolean;
};

type ToggleWidget = BaseWidget & {
  kind: 'toggle';
  key: string;
};

type UnsupportedWidget = BaseWidget & {
  kind: 'unsupported';
  key?: string | null;
  rawType: string;
};

type ParsedWidget =
  | TitleWidget
  | NumberRangeWidget
  | MultiSelectWidget
  | SingleSelectWidget
  | ToggleWidget
  | UnsupportedWidget;

type CategoryFiltersPreviewProps = {
  categorySlug: string | null;
  locale: string;
  isRTL: boolean;
};

const SUPPORTED_NUMBER_RANGE_KEYS = new Set([
  'price',
  'price_per_square',
  'rent',
  'credit',
  'size',
  'floor',
  'floors_count',
  'unit_per_floor',
  'land_area',
]);

const SUPPORTED_MULTI_SELECT_KEYS = new Set(['business-type', 'addon_service_tags']);

const SUPPORTED_SINGLE_SELECT_KEYS = new Set(['recent_ads']);

const SUPPORTED_TOGGLE_KEYS = new Set(['parking', 'elevator', 'warehouse', 'balcony', 'rebuilt', 'has-photo']);

const IGNORED_FILTER_KEYS = new Set(['districts']);

const TRANSLATED_WIDGET_LABEL_KEYS = ['filter_price', 'filter_size', 'filter_price_per_square'] as const;
type TranslatedWidgetLabelKey = (typeof TRANSLATED_WIDGET_LABEL_KEYS)[number];
const TRANSLATED_WIDGET_LABEL_KEY_SET = new Set<TranslatedWidgetLabelKey>(TRANSLATED_WIDGET_LABEL_KEYS);

type TranslateFn = (key: string, values?: TranslationValues) => string;

export function CategoryFiltersPreview({ categorySlug, locale, isRTL }: CategoryFiltersPreviewProps) {
  const t = useTranslations('dashboard.filters');
  const dispatch = useAppDispatch();
  const categoryFilters = useAppSelector((state) => state.searchFilter.categoryFilters);
  const activeFilters = categorySlug ? categoryFilters[categorySlug] ?? {} : {};
  const activeFilterCount = Object.keys(activeFilters).length;
  const hasActiveFilters = activeFilterCount > 0;
  const rangeInputClass =
    'border-0 rounded-none ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-2 py-1';

  const queryArg = categorySlug ?? skipToken;
  const { data, isLoading, isFetching, isError } = useGetPublicDivarCategoryFilterQuery(queryArg);
  const busy = isLoading || isFetching;

  const widgets = useMemo(
    () =>
      categorySlug && data
        ? parseFilterWidgets(data.payload, (key) => key === 'districts')
        : [],
    [categorySlug, data],
  );

  const actionableWidgets = widgets.filter((widget) => widget.kind !== 'title');
  const hasWidgets = actionableWidgets.length > 0;

  const lastSynced = useMemo(() => {
    if (!data?.updatedAt) {
      return null;
    }
    const date = new Date(data.updatedAt);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }, [data?.updatedAt, locale]);

  const clearFilters = () => {
    if (!categorySlug || !hasActiveFilters) {
      return;
    }
    dispatch(clearCategoryFilters({ slug: categorySlug }));
  };

  const updateNumberRange = (key: string, next: { min?: number; max?: number }) => {
    if (!categorySlug) {
      return;
    }
    dispatch(
      setCategoryFilterValue({
        slug: categorySlug,
        key,
        value: {
          kind: 'numberRange',
          ...next,
        },
      }),
    );
  };

  const updateMultiSelect = (key: string, value: string) => {
    if (!categorySlug) {
      return;
    }
    const current = activeFilters[key];
    const nextValues =
      current?.kind === 'multiSelect' ? [...current.values] : [];
    if (nextValues.includes(value)) {
      const filtered = nextValues.filter((item) => item !== value);
      dispatch(
        setCategoryFilterValue({
          slug: categorySlug,
          key,
          value: filtered.length > 0 ? { kind: 'multiSelect', values: filtered } : null,
        }),
      );
    } else {
      dispatch(
        setCategoryFilterValue({
          slug: categorySlug,
          key,
          value: { kind: 'multiSelect', values: [...nextValues, value] },
        }),
      );
    }
  };

  const updateSingleSelect = (key: string, value: string | null) => {
    if (!categorySlug) {
      return;
    }
    dispatch(
      setCategoryFilterValue({
        slug: categorySlug,
        key,
        value: value ? { kind: 'singleSelect', value } : null,
      }),
    );
  };

  const updateToggle = (key: string, checked: boolean) => {
    if (!categorySlug) {
      return;
    }
    dispatch(
      setCategoryFilterValue({
        slug: categorySlug,
        key,
        value: checked ? { kind: 'boolean', value: true } : null,
      }),
    );
  };

  let content: ReactNode = null;

  if (!categorySlug) {
    content = null;
  } else if (busy) {
    content = <p className="text-xs text-muted-foreground">{t('categoryFilters.loading')}</p>;
  } else if (isError) {
    content = <p className="text-xs text-destructive">{t('categoryFilters.error')}</p>;
  } else if (!hasWidgets) {
    content = <p className="text-xs text-muted-foreground">{t('categoryFilters.empty')}</p>;
  } else {
    content = (
      <div className="flex flex-col gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
        {widgets.map((widget) => {
          const label = getWidgetLabel(widget, t);
          switch (widget.kind) {
            case 'title':
              return (
                <div key={widget.id} className="pt-2">
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  {widget.description ? (
                    <p className="text-[11px] text-muted-foreground">{widget.description}</p>
                  ) : null}
                </div>
              );
            case 'numberRange': {
              const current = activeFilters[widget.key];
              const currentMin =
                current?.kind === 'numberRange' && typeof current.min === 'number'
                  ? current.min
                  : undefined;
              const currentMax =
                current?.kind === 'numberRange' && typeof current.max === 'number'
                  ? current.max
                  : undefined;
              return (
                <div key={widget.id} className="rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                  </div>
                  <div className="mt-4 flex items-stretch rounded-lg">
                    <div
                      className={cn('flex flex-1 flex-col gap-2 px-3', 'border-x border-border', 'rounded-s-lg')}
                    >
                      <div className={cn('relative', 'pt-3', isRTL ? 'pl-3' : 'pr-3')}>
                        <Label
                          htmlFor={`${widget.id}-min`}
                          className={cn(
                            'absolute',
                            '-top-1.5',
                            'rounded',
                            'bg-background',
                            'px-1.5',
                            'text-[10px]',
                            'font-medium',
                            'text-muted-foreground',
                            isRTL ? 'right-3' : 'left-3',
                          )}
                        >
                          {t('categoryFilters.numberRange.from')}
                        </Label>
                        <Input
                          id={`${widget.id}-min`}
                          type="text"
                          inputMode="numeric"
                          className={rangeInputClass}
                          dir="ltr"
                          value={formatNumberInput(currentMin, locale)}
                          onChange={(event) => {
                            const nextMin = parseInputNumber(event.target.value);
                            updateNumberRange(widget.key, { min: nextMin, max: currentMax });
                          }}
                        />
                        </div>
                    </div>
                    <div
                      className={cn('flex flex-1 flex-col gap-2 px-3', 'border-x border-border', 'rounded-e-lg', '-ml-px')}
                    >
                      <div className={cn('relative', 'pt-3', isRTL ? 'pr-3' : 'pl-3')}>
                        <Label
                          htmlFor={`${widget.id}-max`}
                          className={cn(
                            'absolute',
                            '-top-1.5',
                            'rounded',
                            'bg-background',
                            'px-1.5',
                            'text-[10px]',
                            'font-medium',
                            'text-muted-foreground',
                            isRTL ? 'right-3' : 'left-3',
                          )}
                        >
                          {t('categoryFilters.numberRange.to')}
                        </Label>
                        <Input
                          id={`${widget.id}-max`}
                          type="text"
                          inputMode="numeric"
                          className={rangeInputClass}
                          dir="ltr"
                          value={formatNumberInput(currentMax, locale)}
                          onChange={(event) => {
                            const nextMax = parseInputNumber(event.target.value);
                            updateNumberRange(widget.key, { min: currentMin, max: nextMax });
                          }}
                        />
                        </div>
                    </div>
                  </div>
                </div>
              );
            }
            case 'multiSelect': {
              const current = activeFilters[widget.key];
              const values = current?.kind === 'multiSelect' ? current.values : [];
              return (
                <div key={widget.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <div className="mt-2 flex flex-wrap gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
                    {widget.options.map((option) => {
                      const selected = values.includes(option.value);
                      if (widget.layout === 'list') {
                        return (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 rounded border border-dashed border-border px-2 py-1 text-xs text-foreground"
                          >
                            <input
                              type="checkbox"
                              className="size-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                              checked={selected}
                              onChange={() => updateMultiSelect(widget.key, option.value)}
                            />
                            {option.label}
                          </label>
                        );
                      }
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            selected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={() => updateMultiSelect(widget.key, option.value)}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }
            case 'singleSelect': {
              const current = activeFilters[widget.key];
              const value = current?.kind === 'singleSelect' ? current.value ?? '' : '';
              return (
                <div key={widget.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <select
                    className="mt-2 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
                    value={value}
                    onChange={(event) =>
                      updateSingleSelect(widget.key, event.target.value || null)
                    }
                  >
                    <option value="">
                      {t('categoryFilters.singleSelectPlaceholder')}
                    </option>
                    {widget.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
            case 'toggle': {
              const current = activeFilters[widget.key];
              const checked = current?.kind === 'boolean' && current.value === true;
              const switchLabelId = `category-filter-toggle-${widget.key}`;
              return (
                <div
                  key={widget.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                >
                  <span id={switchLabelId}>{label}</span>
                  <Switch
                    dir={isRTL ? 'rtl' : 'ltr'}
                    aria-labelledby={switchLabelId}
                    checked={checked}
                    onCheckedChange={(next) => updateToggle(widget.key, next)}
                  />
                </div>
              );
            }
            case 'unsupported':
              return (
                <div key={widget.id} className="rounded-lg border border-dashed border-border px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('categoryFilters.unsupportedField', { type: widget.rawType })}
                  </p>
                </div>
              );
            default:
              return null;
          }
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{t('categoryFilters.title')}</p>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={clearFilters}
          >
            {t('categoryFilters.clear')}
          </Button>
        ) : null}
      </div>
      {hasActiveFilters ? (
        <p className="text-[11px] text-muted-foreground">
          {t('categoryFilters.activeCount', { count: activeFilterCount })}
        </p>
      ) : null}
      {lastSynced ? (
        <p className="text-[11px] text-muted-foreground">{t('categoryFilters.lastSynced', { value: lastSynced })}</p>
      ) : null}
      {content}
    </div>
  );
}

function parseInputNumber(rawInput: string): number | undefined {
  const raw = rawInput?.toString();
  if (!raw || raw.trim().length === 0) {
    return undefined;
  }
  const normalized = normalizeLocalizedDigits(raw).replace(/[,٬\s]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatNumberInput(value: number | undefined, locale: string): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '';
  }
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return value.toString();
  }
}

function normalizeLocalizedDigits(value: string): string {
  const persianZeroCodePoint = '۰'.codePointAt(0) ?? 1776;
  const arabicZeroCodePoint = '٠'.codePointAt(0) ?? 1632;
  return value
    .replace(/[۰-۹]/g, (digit) =>
      String((digit.codePointAt(0) ?? persianZeroCodePoint) - persianZeroCodePoint),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String((digit.codePointAt(0) ?? arabicZeroCodePoint) - arabicZeroCodePoint),
    );
}

function getWidgetLabel(widget: ParsedWidget, translate: TranslateFn): string {
  const fromLabel = resolveWidgetLabelValue(widget.label, translate);
  if (fromLabel) {
    return fromLabel;
  }
  const fromUid = resolveWidgetLabelValue(widget.uid, translate);
  if (fromUid) {
    return fromUid;
  }
  return translate('categoryFilters.widgetFallback');
}

function resolveWidgetLabelValue(value: string | undefined, translate: TranslateFn): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  if (isTranslatedWidgetKey(normalized)) {
    return translate(`categoryFilters.widgetLabels.${normalized}`);
  }
  return normalized;
}

function isTranslatedWidgetKey(value: string): value is TranslatedWidgetLabelKey {
  return TRANSLATED_WIDGET_LABEL_KEY_SET.has(value as TranslatedWidgetLabelKey);
}

function parseFilterWidgets(
  payload: unknown,
  isIgnoredKey: (key: string) => boolean,
): ParsedWidget[] {
  if (!isRecord(payload)) {
    return [];
  }
  const page = payload['page'];
  if (!isRecord(page)) {
    return [];
  }
  const widgetList = page['widget_list'];
  if (!Array.isArray(widgetList)) {
    return [];
  }
  const widgets: ParsedWidget[] = [];
  widgetList.forEach((entry, index) => {
    if (!isRecord(entry)) {
      return;
    }
    const widgetType = getString(entry, 'widget_type') ?? 'UNKNOWN';
    const data = isRecord(entry['data']) ? entry['data'] : undefined;
    const field = isRecord(data?.['field']) ? data?.['field'] : undefined;
    const fieldKey = field ? getString(field, 'key') : undefined;
    const label = resolveWidgetLabel(entry, data);
    const description = getDescription(data);
    const uid = getString(entry, 'uid') ?? undefined;
    const id = uid ?? `${widgetType}-${index}`;
    const baseWidget: BaseWidget = {
      id,
      label,
      description,
      uid,
    };

    if (fieldKey && (IGNORED_FILTER_KEYS.has(fieldKey) || isIgnoredKey(fieldKey))) {
      return;
    }

    switch (widgetType) {
      case 'TITLE_ROW':
        widgets.push({ ...baseWidget, kind: 'title' });
        return;
      case 'I_MANUAL_INPUT_NUMBER_RANGE_ROW':
      case 'I_SELECTIVE_RANGE_ROW': {
        if (!fieldKey || !SUPPORTED_NUMBER_RANGE_KEYS.has(fieldKey)) {
          widgets.push({
            ...baseWidget,
            kind: 'unsupported',
            key: fieldKey ?? null,
            rawType: widgetType,
          });
          return;
        }
        widgets.push({
          ...baseWidget,
          kind: 'numberRange',
          key: fieldKey,
          unit: getString(data, 'unit'),
        });
        return;
      }
      case 'I_MULTI_SELECT_V2_ROW':
      case 'I_MULTI_SELECT_CHIP_ROW': {
        if (!fieldKey || !SUPPORTED_MULTI_SELECT_KEYS.has(fieldKey)) {
          widgets.push({
            ...baseWidget,
            kind: 'unsupported',
            key: fieldKey ?? null,
            rawType: widgetType,
          });
          return;
        }
        const options = getOptions(data);
        widgets.push({
          ...baseWidget,
          kind: 'multiSelect',
          key: fieldKey,
          options,
          layout: widgetType === 'I_MULTI_SELECT_CHIP_ROW' ? 'chips' : 'list',
        });
        return;
      }
      case 'I_SINGLE_SELECT_ROW': {
        if (!fieldKey || !SUPPORTED_SINGLE_SELECT_KEYS.has(fieldKey)) {
          widgets.push({
            ...baseWidget,
            kind: 'unsupported',
            key: fieldKey ?? null,
            rawType: widgetType,
          });
          return;
        }
        const options = getOptions(data);
        widgets.push({
          ...baseWidget,
          kind: 'singleSelect',
          key: fieldKey,
          options,
          clearable: Boolean(data?.['clearable']),
        });
        return;
      }
      case 'I_TOGGLE_ROW': {
        if (!fieldKey || !SUPPORTED_TOGGLE_KEYS.has(fieldKey)) {
          widgets.push({
            ...baseWidget,
            kind: 'unsupported',
            key: fieldKey ?? null,
            rawType: widgetType,
          });
          return;
        }
        widgets.push({
          ...baseWidget,
          kind: 'toggle',
          key: fieldKey,
        });
        return;
      }
      default:
        widgets.push({
          ...baseWidget,
          kind: 'unsupported',
          key: fieldKey ?? null,
          rawType: widgetType,
        });
    }
  });
  return widgets;
}

function getOptions(data?: Record<string, unknown>): FilterOption[] {
  const options = Array.isArray(data?.['options']) ? data?.['options'] : [];
  return options
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

function getDescription(data?: Record<string, unknown>) {
  return (
    getString(data, 'description') ??
    getString(data, 'placeholder') ??
    getString(data, 'bottom_sheet_hint') ??
    undefined
  );
}

function getString(object: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!object) {
    return undefined;
  }
  const value = object[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
