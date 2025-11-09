import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type SelectionMode = 'all' | 'custom';

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
  resetSearchFilter,
} = searchFilterSlice.actions;

export default searchFilterSlice.reducer;
export { initialState as searchFilterInitialState };
