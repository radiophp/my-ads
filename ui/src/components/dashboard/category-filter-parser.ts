import { FilterOption } from './category-filter-types';
import type {
  BaseWidget,
  ParsedWidget,
  TranslateFn,
} from './category-filter-types';
import {
  IGNORED_FILTER_KEYS,
  SUPPORTED_NUMBER_RANGE_KEYS,
  SUPPORTED_MULTI_SELECT_KEYS,
  SUPPORTED_SINGLE_SELECT_KEYS,
  SUPPORTED_TOGGLE_KEYS,
  TRANSLATED_WIDGET_LABEL_KEY_SET,
} from './category-filter-constants';
import type { TranslatedWidgetLabelKey } from './category-filter-constants';

export function parseInputNumber(rawInput: string): number | undefined {
  const raw = rawInput?.toString();
  if (!raw || raw.trim().length === 0) {
    return undefined;
  }
  const normalized = normalizeLocalizedDigits(raw).replace(/[,٬\s]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatNumberInput(value: number | undefined, locale: string): string {
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

export function getWidgetLabel(widget: ParsedWidget, translate: TranslateFn): string {
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

export function parseFilterWidgets(
  payload: unknown,
  isIgnoredKey: (key: string) => boolean,
  normalizedOptions: Record<string, FilterOption[]> = {},
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
        const options = getOptions(data, fieldKey ? normalizedOptions[fieldKey] : undefined);
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
        const options = getOptions(data, fieldKey ? normalizedOptions[fieldKey] : undefined);
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
