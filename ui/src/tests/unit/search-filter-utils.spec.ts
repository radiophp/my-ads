import { describe, it, expect } from 'vitest';
import {
  cloneSearchFilterState,
  mergeSavedFilterState,
} from '@/features/search-filter/utils';
import type { NoteFilterOption, SearchFilterState } from '@/features/search-filter/searchFilterSlice';

describe('search-filter utils', () => {
  const fullState: SearchFilterState = {
    provinceId: 1,
    citySelection: { mode: 'custom', cityIds: [1, 2, 3] },
    districtSelection: { mode: 'custom', districtIds: [10, 20] },
    categorySelection: { slug: 'buy-apartment', depth: 2 },
    categoryFilters: {
      'buy-apartment': {
        price: { kind: 'numberRange', min: 100, max: 500 },
        type: { kind: 'multiSelect', values: ['new', 'old'] },
        floor: { kind: 'singleSelect', value: '3' },
        elevator: { kind: 'boolean', value: true },
      },
    },
    ringBinderFolderId: 'folder-1',
    noteFilter: 'has',
  };

  describe('cloneSearchFilterState', () => {
    it('clones a full state', () => {
      const cloned = cloneSearchFilterState(fullState);
      expect(cloned).toEqual(fullState);
      expect(cloned).not.toBe(fullState);
      expect(cloned.citySelection).not.toBe(fullState.citySelection);
      expect(cloned.districtSelection).not.toBe(fullState.districtSelection);
      expect(cloned.categorySelection).not.toBe(fullState.categorySelection);
      expect(cloned.categoryFilters).not.toBe(fullState.categoryFilters);
    });

    it('normalizes city mode to "all" when mode is "custom" but no IDs', () => {
      const result = cloneSearchFilterState({
        ...fullState,
        citySelection: { mode: 'custom' as const, cityIds: [] },
      });
      expect(result.citySelection.mode).toBe('all');
      expect(result.citySelection.cityIds).toEqual([]);
    });

    it('deduplicates city IDs', () => {
      const result = cloneSearchFilterState({
        ...fullState,
        citySelection: { mode: 'custom' as const, cityIds: [1, 2, 1, 3] },
      });
      expect(result.citySelection.cityIds).toEqual([1, 2, 3]);
    });

    it('filters non-finite city IDs', () => {
      const result = cloneSearchFilterState({
        ...fullState,
        citySelection: { mode: 'custom' as const, cityIds: [1, NaN, 2] },
      });
      expect(result.citySelection.cityIds).toEqual([1, 2]);
    });

    it('filters non-finite district IDs', () => {
      const result = cloneSearchFilterState({
        ...fullState,
        districtSelection: { mode: 'custom' as const, districtIds: [10, Infinity, 20] },
      });
      expect(result.districtSelection.districtIds).toEqual([10, 20]);
    });

    it('passes through NaN provinceId (typeof NaN is "number")', () => {
      const result = cloneSearchFilterState({
        ...fullState,
        provinceId: NaN,
      });
      expect(Number.isNaN(result.provinceId)).toBe(true);
    });

    it('normalizes empty category slug to null', () => {
      const result = cloneSearchFilterState({
        ...fullState,
        categorySelection: { slug: '', depth: null },
      });
      expect(result.categorySelection.slug).toBeNull();
    });

    it('clones category filter values', () => {
      const result = cloneSearchFilterState(fullState);
      const buyApt = result.categoryFilters['buy-apartment'];
      expect(buyApt).toBeDefined();
      expect(buyApt!['price']).toEqual({ kind: 'numberRange', min: 100, max: 500 });
    });

    it('clones numberRange without missing fields', () => {
      const result = cloneSearchFilterState({
        ...fullState,
        categoryFilters: {
          'buy-apartment': {
            priceOnlyMax: { kind: 'numberRange', max: 1000 },
          },
        },
      });
      const range = result.categoryFilters['buy-apartment']!['priceOnlyMax'];
      expect(range).toEqual({ kind: 'numberRange', max: 1000 });
    });

    it('filters empty strings from multiSelect values', () => {
      const result = cloneSearchFilterState({
        ...fullState,
        categoryFilters: {
          'buy-apartment': {
            type: { kind: 'multiSelect', values: ['a', '', 'b', ''] },
          },
        },
      });
      const ms = result.categoryFilters['buy-apartment']!['type'];
      expect(ms).toEqual({ kind: 'multiSelect', values: ['a', 'b'] });
    });

    it('filters null/empty values from multiSelect', () => {
      const result = cloneSearchFilterState({
        ...fullState,
        categoryFilters: {
          'buy-apartment': {
            type: { kind: 'multiSelect', values: ['a', '', 'b'] },
          },
        },
      });
      const ms = result.categoryFilters['buy-apartment']!['type'];
      expect(ms).toEqual({ kind: 'multiSelect', values: ['a', 'b'] });
    });

    it('sets singleSelect value to null for empty string', () => {
      const result = cloneSearchFilterState({
        ...fullState,
        categoryFilters: {
          'buy-apartment': {
            floor: { kind: 'singleSelect', value: '' },
          },
        },
      });
      const ss = result.categoryFilters['buy-apartment']!['floor'];
      expect(ss).toEqual({ kind: 'singleSelect', value: null });
    });

    it('coerces boolean false to null', () => {
      const result = cloneSearchFilterState({
        ...fullState,
        categoryFilters: {
          'buy-apartment': {
            elevator: { kind: 'boolean', value: false },
          },
        },
      });
      const b = result.categoryFilters['buy-apartment']!['elevator'];
      expect(b).toEqual({ kind: 'boolean', value: null });
    });

    it('handles noteFilter values', () => {
      expect(
        cloneSearchFilterState({ ...fullState, noteFilter: 'none' as const }).noteFilter,
      ).toBe('none');
      expect(
        cloneSearchFilterState({ ...fullState, noteFilter: 'all' as const }).noteFilter,
      ).toBe('all');
    });

    it('normalizes invalid noteFilter to "all"', () => {
      const result = cloneSearchFilterState({
        ...fullState,
        noteFilter: 'invalid' as NoteFilterOption,
      });
      expect(result.noteFilter).toBe('all');
    });

    it('handles ringBinderFolderId', () => {
      const withFolder = cloneSearchFilterState({ ...fullState, ringBinderFolderId: 'f1' });
      expect(withFolder.ringBinderFolderId).toBe('f1');

      const withoutFolder = cloneSearchFilterState({ ...fullState, ringBinderFolderId: '' });
      expect(withoutFolder.ringBinderFolderId).toBeNull();
    });

    it('skips empty category filter buckets', () => {
      const result = cloneSearchFilterState({
        ...fullState,
        categoryFilters: {
          'empty-bucket': {},
      'null-bucket': {} as Record<string, import('@/features/search-filter/searchFilterSlice').CategoryFilterValue>,
      'valid-bucket': { test: { kind: 'boolean', value: true } },
        },
      });
      expect(result.categoryFilters['empty-bucket']).toBeUndefined();
      expect(result.categoryFilters['null-bucket']).toBeUndefined();
      expect(result.categoryFilters['valid-bucket']).toBeDefined();
    });
  });

  describe('mergeSavedFilterState', () => {
    it('delegates to cloneSearchFilterState', () => {
      const result = mergeSavedFilterState(fullState);
      expect(result).toEqual(cloneSearchFilterState(fullState));
    });
  });
});
