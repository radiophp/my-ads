import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type SelectionMode = 'all' | 'custom';

export type CategoryFilterValue =
  | { kind: 'numberRange'; min?: number | null; max?: number | null }
  | { kind: 'multiSelect'; values: string[] }
  | { kind: 'singleSelect'; value: string | null }
  | { kind: 'boolean'; value: boolean | null };

export type CategoryFilterBuckets = Record<string, Record<string, CategoryFilterValue>>;

export type SearchFilterState = {
  provinceId: number | null;
  citySelection: {
    mode: SelectionMode;
    cityIds: number[];
  };
  districtSelection: {
    mode: SelectionMode;
    districtIds: number[];
  };
  categorySelection: {
    slug: string | null;
    depth: number | null;
  };
  categoryFilters: CategoryFilterBuckets;
  ringBinderFolderId: string | null;
};

const initialState: SearchFilterState = {
  provinceId: null,
  citySelection: {
    mode: 'all',
    cityIds: [],
  },
  districtSelection: {
    mode: 'all',
    districtIds: [],
  },
  categorySelection: {
    slug: null,
    depth: null,
  },
  categoryFilters: {},
  ringBinderFolderId: null,
};

const searchFilterSlice = createSlice({
  name: 'searchFilter',
  initialState,
  reducers: {
    setProvince(state, action: PayloadAction<number | null>) {
      state.provinceId = action.payload;
      // Whenever province changes, default to "all cities" to avoid stale selections.
      state.citySelection = { mode: 'all', cityIds: [] };
      state.districtSelection = { mode: 'all', districtIds: [] };
    },
    setCitySelectionMode(state, action: PayloadAction<SelectionMode>) {
      state.citySelection.mode = action.payload;
      if (action.payload === 'all') {
        state.citySelection.cityIds = [];
        state.districtSelection = { mode: 'all', districtIds: [] };
      }
    },
    setSelectedCities(state, action: PayloadAction<number[]>) {
      const uniqueIds = Array.from(new Set(action.payload));
      state.citySelection.cityIds = uniqueIds;
      state.citySelection.mode = uniqueIds.length === 0 ? 'all' : 'custom';
      state.districtSelection = { mode: 'all', districtIds: [] };
    },
    setDistrictSelectionMode(state, action: PayloadAction<SelectionMode>) {
      state.districtSelection.mode = action.payload;
      if (action.payload === 'all') {
        state.districtSelection.districtIds = [];
      }
    },
    setSelectedDistricts(state, action: PayloadAction<number[]>) {
      const uniqueIds = Array.from(new Set(action.payload));
      state.districtSelection.districtIds = uniqueIds;
      state.districtSelection.mode = uniqueIds.length === 0 ? 'all' : 'custom';
    },
    setCategorySelection(state, action: PayloadAction<{ slug: string | null; depth: number | null }>) {
      state.categorySelection = {
        slug: action.payload.slug,
        depth: action.payload.depth,
      };
    },
    setRingBinderFolder(state, action: PayloadAction<string | null>) {
      state.ringBinderFolderId = action.payload;
    },
    setCategoryFilterValue(
      state,
      action: PayloadAction<{
        slug: string;
        key: string;
        value: CategoryFilterValue | null;
      }>,
    ) {
      const { slug, key, value } = action.payload;
      if (!slug || !key) {
        return;
      }
      if (!state.categoryFilters[slug]) {
        state.categoryFilters[slug] = {};
      }
      const bucket = state.categoryFilters[slug]!;
      if (shouldRemoveFilterValue(value)) {
        delete bucket[key];
        if (Object.keys(bucket).length === 0) {
          delete state.categoryFilters[slug];
        }
      } else {
        bucket[key] = value as CategoryFilterValue;
      }
    },
    clearCategoryFilters(state, action: PayloadAction<{ slug: string }>) {
      const { slug } = action.payload;
      if (!slug) {
        return;
      }
      delete state.categoryFilters[slug];
    },
    resetSearchFilter: () => initialState,
  },
});

export const {
  setProvince,
  setCitySelectionMode,
  setSelectedCities,
  setDistrictSelectionMode,
  setSelectedDistricts,
  setCategorySelection,
  setCategoryFilterValue,
  clearCategoryFilters,
  setRingBinderFolder,
  resetSearchFilter,
} = searchFilterSlice.actions;

export default searchFilterSlice.reducer;
export { initialState as searchFilterInitialState };

function shouldRemoveFilterValue(value: CategoryFilterValue | null): boolean {
  if (!value) {
    return true;
  }
  switch (value.kind) {
    case 'numberRange':
      return value.min === undefined && value.max === undefined;
    case 'multiSelect':
      return !value.values || value.values.length === 0;
    case 'singleSelect':
      return value.value === null || value.value === undefined || value.value === '';
    case 'boolean':
      return value.value !== true;
    default:
      return false;
  }
}
