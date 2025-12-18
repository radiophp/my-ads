import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type SelectionMode = 'all' | 'custom';

export type CategoryFilterValue =
  | { kind: 'numberRange'; min?: number | null; max?: number | null }
  | { kind: 'multiSelect'; values: string[] }
  | { kind: 'singleSelect'; value: string | null }
  | { kind: 'boolean'; value: boolean | null };

export type CategoryFilterBuckets = Record<string, Record<string, CategoryFilterValue>>;

export type NoteFilterOption = 'all' | 'has' | 'none';

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
  noteFilter: NoteFilterOption;
};

export type SearchFilterSliceState = SearchFilterState & {
  persistNonce: number;
};

const initialFilterState: SearchFilterState = {
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
  noteFilter: 'all',
};

const initialState: SearchFilterSliceState = {
  ...initialFilterState,
  persistNonce: 0,
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
    setNoteFilter(state, action: PayloadAction<NoteFilterOption>) {
      state.noteFilter = action.payload;
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
    resetSearchFilter: (state) => {
      state.provinceId = initialFilterState.provinceId;
      state.citySelection = initialFilterState.citySelection;
      state.districtSelection = initialFilterState.districtSelection;
      state.categorySelection = initialFilterState.categorySelection;
      state.categoryFilters = initialFilterState.categoryFilters;
      state.ringBinderFolderId = initialFilterState.ringBinderFolderId;
      state.noteFilter = initialFilterState.noteFilter;
    },
    hydrateFromSaved: (state, action: PayloadAction<SearchFilterState>) => {
      state.provinceId = action.payload.provinceId;
      state.citySelection = action.payload.citySelection;
      state.districtSelection = action.payload.districtSelection;
      state.categorySelection = action.payload.categorySelection;
      state.categoryFilters = action.payload.categoryFilters;
      state.ringBinderFolderId = action.payload.ringBinderFolderId;
      state.noteFilter = action.payload.noteFilter;
    },
    commitAppliedFilters: (state) => {
      state.persistNonce += 1;
    },
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
  setNoteFilter,
  resetSearchFilter,
  hydrateFromSaved,
  commitAppliedFilters,
} = searchFilterSlice.actions;

export default searchFilterSlice.reducer;
export { initialFilterState as searchFilterInitialState };

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
