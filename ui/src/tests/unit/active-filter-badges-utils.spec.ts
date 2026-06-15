import { describe, it, expect } from 'vitest';
import {
  normalizeWidgetLabelKey,
  isRecord,
  getString,
  getOptions,
  resolveWidgetLabel,
  formatCategoryFilterValue,
} from '@/components/dashboard/active-filter-badges-utils';
import type { CategoryFilterValue } from '@/features/search-filter/searchFilterSlice';

describe('active-filter-badges-utils', () => {
  describe('normalizeWidgetLabelKey', () => {
    it('strips full prefix', () => {
      expect(normalizeWidgetLabelKey('dashboard.filters.categoryFilters.widgetLabels.size')).toBe('size');
    });

    it('strips short prefix', () => {
      expect(normalizeWidgetLabelKey('categoryFilters.widgetLabels.size')).toBe('size');
    });

    it('returns trimmed value when no prefix', () => {
      expect(normalizeWidgetLabelKey('  size  ')).toBe('size');
    });
  });

  describe('isRecord', () => {
    it('returns true for plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ a: 1 })).toBe(true);
    });

    it('returns false for null, arrays, primitives', () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord([1, 2])).toBe(false);
      expect(isRecord('string')).toBe(false);
      expect(isRecord(42)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
    });
  });

  describe('getString', () => {
    it('extracts string value by key', () => {
      expect(getString({ name: 'test' }, 'name')).toBe('test');
    });

    it('returns undefined for missing key', () => {
      expect(getString({ name: 'test' }, 'missing')).toBeUndefined();
    });

    it('returns undefined for non-string value', () => {
      expect(getString({ age: 30 }, 'age')).toBeUndefined();
    });

    it('returns undefined for undefined object', () => {
      expect(getString(undefined, 'key')).toBeUndefined();
    });
  });

  describe('getOptions', () => {
    it('extracts options from data', () => {
      const data = {
        options: [
          { key: 'k1', title: 'تیتر ۱' },
          { key: 'k2', title: 'تیتر ۲' },
        ],
      };
      const result = getOptions(data);
      expect(result).toEqual([
        { value: 'k1', label: 'تیتر ۱' },
        { value: 'k2', label: 'تیتر ۲' },
      ]);
    });

    it('falls back to fallbackOptions when no data options', () => {
      const fallback = [{ value: 'f1', label: 'Fallback' }];
      expect(getOptions({}, fallback)).toEqual(fallback);
    });

    it('filters out ALL_POSSIBLE_OPTIONS', () => {
      const data = {
        options: [
          { key: 'ALL_POSSIBLE_OPTIONS', title: 'All' },
          { key: 'k1', title: 'Option 1' },
        ],
      };
      const result = getOptions(data);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('k1');
    });

    it('skips invalid options', () => {
      const data = {
        options: [
          { key: 'k1' },
          { value: 'v2' },
          { key: 'k3', title: 't3' },
          { key: 'k4', label: 'valid' },
        ],
      };
      const result = getOptions(data);
      expect(result).toHaveLength(3);
    });
  });

  describe('resolveWidgetLabel', () => {
    it('resolves label from data fields in order', () => {
      expect(resolveWidgetLabel({}, { filter_page_title: 'Page Title' })).toBe('Page Title');
      expect(resolveWidgetLabel({}, { title: 'Widget Title' })).toBe('Widget Title');
      expect(resolveWidgetLabel({}, { bottom_sheet_title: 'Sheet Title' })).toBe('Sheet Title');
    });

    it('falls back to entry uid', () => {
      expect(resolveWidgetLabel({ uid: 'fallback-id' }, {})).toBe('fallback-id');
    });

    it('returns empty string when nothing matches', () => {
      expect(resolveWidgetLabel({}, {})).toBe('');
    });
  });

  describe('formatCategoryFilterValue', () => {
    const fmt = (v: number) => v.toLocaleString('en-US');
    const t = (key: string) => {
      const dict: Record<string, string> = {
        'badges.enabled': 'Enabled',
      };
      return dict[key] ?? key;
    };
    const options = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ];

    it('formats numberRange with both min and max (LTR)', () => {
      const value: CategoryFilterValue = { kind: 'numberRange', min: 100, max: 500 };
      expect(formatCategoryFilterValue(value, options, fmt, false, t)).toBe('100 - 500');
    });

    it('formats numberRange with both min and max (RTL)', () => {
      const value: CategoryFilterValue = { kind: 'numberRange', min: 100, max: 500 };
      expect(formatCategoryFilterValue(value, options, fmt, true, t)).toBe('100 تا 500');
    });

    it('formats numberRange with only min', () => {
      const value: CategoryFilterValue = { kind: 'numberRange', min: 100 };
      expect(formatCategoryFilterValue(value, options, fmt, false, t)).toBe('from 100');
    });

    it('formats numberRange with only max (RTL)', () => {
      const value: CategoryFilterValue = { kind: 'numberRange', max: 500 };
      expect(formatCategoryFilterValue(value, options, fmt, true, t)).toBe('تا 500');
    });

    it('returns null for empty numberRange', () => {
      const value: CategoryFilterValue = { kind: 'numberRange' };
      expect(formatCategoryFilterValue(value, options, fmt, false, t)).toBeNull();
    });

    it('formats multiSelect with option labels', () => {
      const value: CategoryFilterValue = { kind: 'multiSelect', values: ['a', 'b'] };
      expect(formatCategoryFilterValue(value, options, fmt, false, t)).toBe('Option A, Option B');
    });

    it('formats multiSelect with RTL separator', () => {
      const value: CategoryFilterValue = { kind: 'multiSelect', values: ['a'] };
      expect(formatCategoryFilterValue(value, options, fmt, true, t)).toBe('Option A');
    });

    it('returns label for matched singleSelect', () => {
      const value: CategoryFilterValue = { kind: 'singleSelect', value: 'a' };
      expect(formatCategoryFilterValue(value, options, fmt, false, t)).toBe('Option A');
    });

    it('returns raw value for unmatched singleSelect', () => {
      const value: CategoryFilterValue = { kind: 'singleSelect', value: 'z' };
      expect(formatCategoryFilterValue(value, options, fmt, false, t)).toBe('z');
    });

    it('returns null for empty singleSelect', () => {
      const value: CategoryFilterValue = { kind: 'singleSelect', value: null };
      expect(formatCategoryFilterValue(value, options, fmt, false, t)).toBeNull();
    });

    it('formats boolean', () => {
      const value: CategoryFilterValue = { kind: 'boolean', value: true };
      expect(formatCategoryFilterValue(value, options, fmt, false, t)).toBe('Enabled');
    });

    it('returns null for boolean false', () => {
      const value: CategoryFilterValue = { kind: 'boolean', value: false };
      expect(formatCategoryFilterValue(value, options, fmt, false, t)).toBeNull();
    });

    it('returns null for unsupported kind', () => {
      const value = { kind: 'unsupported' } as unknown as CategoryFilterValue;
      expect(formatCategoryFilterValue(value, options, fmt, false, t)).toBeNull();
    });
  });
});
