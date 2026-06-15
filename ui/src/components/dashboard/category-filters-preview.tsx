'use client';

import { skipToken } from '@reduxjs/toolkit/query';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useGetPublicDivarCategoryFilterQuery } from '@/features/api/endpoints/divar-category-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { setCategoryFilterValue } from '@/features/search-filter/searchFilterSlice';

import type {
  FilterOptionsModalState,
  MultiSelectWidget,
  SingleSelectWidget,
} from './category-filter-types';
import { parseFilterWidgets, parseInputNumber, formatNumberInput, getWidgetLabel } from './category-filter-parser';
import { FilterOptionsDialog } from './category-filter-options-dialog';

type CategoryFiltersPreviewProps = {
  categorySlug: string | null;
  locale: string;
  isRTL: boolean;
  includeKeys?: string[];
  excludeKeys?: string[];
};

export function CategoryFiltersPreview({
  categorySlug,
  locale,
  isRTL,
  includeKeys,
  excludeKeys,
}: CategoryFiltersPreviewProps) {
  const t = useTranslations('dashboard.filters');
  const dispatch = useAppDispatch();
  const categoryFilters = useAppSelector((state) => state.searchFilter.categoryFilters);
  const activeFilters = categorySlug ? categoryFilters[categorySlug] ?? {} : {};
  const [filterOptionsModal, setFilterOptionsModal] = useState<FilterOptionsModalState | null>(null);
  const rangeInputClass =
    'h-9 w-full rounded-none border-0 bg-transparent px-2 py-1 ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0';

  const queryArg = categorySlug ?? skipToken;
  const { data, isLoading, isFetching, isError } = useGetPublicDivarCategoryFilterQuery(queryArg);
  const busy = isLoading || isFetching;

  const widgets = useMemo(
    () =>
      categorySlug && data
        ? parseFilterWidgets(
            data.payload,
            (key) => key === 'districts',
            data.normalizedOptions ?? {},
          )
        : [],
    [categorySlug, data],
  );

  const includeKeySet = useMemo(
    () => (Array.isArray(includeKeys) && includeKeys.length > 0 ? new Set(includeKeys) : null),
    [includeKeys],
  );
  const excludeKeySet = useMemo(
    () => (Array.isArray(excludeKeys) && excludeKeys.length > 0 ? new Set(excludeKeys) : null),
    [excludeKeys],
  );

  const actionableWidgets = useMemo(() => {
    const filtered = widgets.filter((widget) => widget.kind !== 'title');
    if (!includeKeySet && !excludeKeySet) {
      return filtered;
    }
    return filtered.filter((widget) => {
      const key = 'key' in widget ? widget.key : null;
      if (!key) {
        return false;
      }
      if (includeKeySet && !includeKeySet.has(key)) {
        return false;
      }
      if (excludeKeySet && excludeKeySet.has(key)) {
        return false;
      }
      return true;
    });
  }, [excludeKeySet, includeKeySet, widgets]);
  const hasWidgets = actionableWidgets.length > 0;
  const filterPlaceholderText = t('categoryFilters.singleSelectPlaceholder');

  const getActiveMultiValues = (key: string): string[] => {
    const entry = activeFilters[key];
    return entry?.kind === 'multiSelect' ? entry.values : [];
  };

  const getActiveSingleValue = (key: string): string | null => {
    const entry = activeFilters[key];
    if (entry?.kind === 'singleSelect') {
      return entry.value ?? null;
    }
    return null;
  };

  const openFilterOptionsModal = (widget: MultiSelectWidget | SingleSelectWidget) => {
    if (!categorySlug) {
      return;
    }
    if (widget.options.length === 0) {
      return;
    }
    if (widget.kind === 'multiSelect') {
      setFilterOptionsModal({
        type: 'multi',
        key: widget.key,
        title: widget.label,
        description: widget.description,
        options: widget.options,
      });
    } else {
      setFilterOptionsModal({
        type: 'single',
        key: widget.key,
        title: widget.label,
        description: widget.description,
        options: widget.options,
        clearable: widget.clearable,
      });
    }
  };

  const handleModalClose = () => {
    setFilterOptionsModal(null);
  };

  const handleModalConfirmMulti = (key: string, values: string[]) => {
    if (!categorySlug) {
      return;
    }
    dispatch(
      setCategoryFilterValue({
        slug: categorySlug,
        key,
        value: values.length > 0 ? { kind: 'multiSelect', values } : null,
      }),
    );
    setFilterOptionsModal(null);
  };

  const handleModalConfirmSingle = (key: string, value: string | null) => {
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
    setFilterOptionsModal(null);
  };

  const modalSelectedMultiValues =
    filterOptionsModal && filterOptionsModal.type === 'multi'
      ? getActiveMultiValues(filterOptionsModal.key)
      : [];
  const modalSelectedSingleValue =
    filterOptionsModal && filterOptionsModal.type === 'single'
      ? getActiveSingleValue(filterOptionsModal.key)
      : null;

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
        {actionableWidgets.map((widget) => {
          const label = getWidgetLabel(widget, t);
          switch (widget.kind) {
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
                  <div className="mt-4 flex items-stretch gap-2">
                    <div
                      className={cn('flex flex-1 flex-col gap-2 rounded-lg bg-muted/30 px-3')}
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
                      className={cn('flex flex-1 flex-col gap-2 rounded-lg bg-muted/30 px-3')}
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
              const selectedValues = getActiveMultiValues(widget.key);
              const optionLabelMap = new Map(widget.options.map((option) => [option.value, option.label]));
              const summary =
                selectedValues.length > 0
                  ? selectedValues
                      .map((value) => optionLabelMap.get(value) ?? value)
                      .join('، ')
                  : filterPlaceholderText;
              return (
                <div key={widget.id} className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full justify-between text-sm"
                    onClick={() => openFilterOptionsModal(widget)}
                    disabled={widget.options.length === 0}
                  >
                    <span
                      dir={isRTL ? 'rtl' : 'ltr'}
                      className="flex w-full flex-row items-center justify-between gap-3"
                    >
                      <span className={cn('flex-1 truncate', isRTL ? 'text-right' : 'text-left')}>
                        {widget.options.length === 0 ? filterPlaceholderText : summary}
                      </span>
                      {isRTL ? (
                        <ChevronLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      )}
                    </span>
                  </Button>
                </div>
              );
            }
            case 'singleSelect': {
              const selectedValue = getActiveSingleValue(widget.key);
              const optionLabelMap = new Map(widget.options.map((option) => [option.value, option.label]));
              const summary = selectedValue
                ? optionLabelMap.get(selectedValue) ?? selectedValue
                : filterPlaceholderText;
              return (
                <div key={widget.id} className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full justify-between text-sm"
                    onClick={() => openFilterOptionsModal(widget)}
                    disabled={widget.options.length === 0}
                  >
                    <span
                      dir={isRTL ? 'rtl' : 'ltr'}
                      className="flex w-full flex-row items-center justify-between gap-3"
                    >
                      <span className={cn('flex-1 truncate', isRTL ? 'text-right' : 'text-left')}>
                        {widget.options.length === 0 ? filterPlaceholderText : summary}
                      </span>
                      {isRTL ? (
                        <ChevronLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      )}
                    </span>
                  </Button>
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
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm text-foreground"
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
                <div key={widget.id} className="rounded-lg bg-muted/30 px-3 py-2">
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
      {content}
      <FilterOptionsDialog
        modal={filterOptionsModal}
        open={Boolean(filterOptionsModal)}
        onClose={handleModalClose}
        selectedMultiValues={modalSelectedMultiValues}
        selectedSingleValue={modalSelectedSingleValue}
        onConfirmMulti={handleModalConfirmMulti}
        onConfirmSingle={handleModalConfirmSingle}
        isRTL={isRTL}
        placeholder={filterPlaceholderText}
        translation={t}
      />
    </div>
  );
}


