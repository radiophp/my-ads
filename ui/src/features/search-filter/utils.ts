import type {
  CategoryFilterBuckets,
  CategoryFilterValue,
  SearchFilterState,
} from '@/features/search-filter/searchFilterSlice';

export function cloneSearchFilterState(state: SearchFilterState): SearchFilterState {
  return {
    provinceId: typeof state.provinceId === 'number' ? state.provinceId : null,
    citySelection: {
      mode: state.citySelection.mode === 'custom' && state.citySelection.cityIds.length > 0 ? 'custom' : 'all',
      cityIds:
        state.citySelection.mode === 'custom'
          ? Array.from(new Set(state.citySelection.cityIds.filter(isFiniteNumber)))
          : [],
    },
    districtSelection: {
      mode:
        state.districtSelection.mode === 'custom' && state.districtSelection.districtIds.length > 0
          ? 'custom'
          : 'all',
      districtIds:
        state.districtSelection.mode === 'custom'
          ? Array.from(new Set(state.districtSelection.districtIds.filter(isFiniteNumber)))
          : [],
    },
    categorySelection: {
      slug:
        typeof state.categorySelection.slug === 'string' && state.categorySelection.slug.length > 0
          ? state.categorySelection.slug
          : null,
      depth:
        typeof state.categorySelection.depth === 'number' && Number.isFinite(state.categorySelection.depth)
          ? state.categorySelection.depth
          : null,
    },
    categoryFilters: cloneCategoryFilters(state.categoryFilters),
    ringBinderFolderId:
      typeof state.ringBinderFolderId === 'string' && state.ringBinderFolderId.length > 0
        ? state.ringBinderFolderId
        : null,
    noteFilter: state.noteFilter === 'has' || state.noteFilter === 'none' ? state.noteFilter : 'all',
  };
}

export function mergeSavedFilterState(payload: SearchFilterState): SearchFilterState {
  return cloneSearchFilterState(payload);
}

function cloneCategoryFilters(source: CategoryFilterBuckets): CategoryFilterBuckets {
  const result: CategoryFilterBuckets = {};
  for (const [slug, bucket] of Object.entries(source)) {
    if (!bucket || typeof bucket !== 'object') {
      continue;
    }
    const clonedBucket: Record<string, CategoryFilterValue> = {};
    for (const [key, value] of Object.entries(bucket)) {
      if (!value) {
        continue;
      }
      clonedBucket[key] = cloneCategoryFilterValue(value);
    }
    if (Object.keys(clonedBucket).length > 0) {
      result[slug] = clonedBucket;
    }
  }
  return result;
}

function cloneCategoryFilterValue(value: CategoryFilterValue): CategoryFilterValue {
  switch (value.kind) {
    case 'numberRange':
      return {
        kind: 'numberRange',
        ...(typeof value.min === 'number' && Number.isFinite(value.min) ? { min: value.min } : {}),
        ...(typeof value.max === 'number' && Number.isFinite(value.max) ? { max: value.max } : {}),
      };
    case 'multiSelect':
      return {
        kind: 'multiSelect',
        values: Array.isArray(value.values)
          ? value.values.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
          : [],
      };
    case 'singleSelect':
      return {
        kind: 'singleSelect',
        value:
          typeof value.value === 'string' && value.value.length > 0 ? value.value : null,
      };
    case 'boolean':
      return {
        kind: 'boolean',
        value: value.value === true ? true : null,
      };
    default:
      return value;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
