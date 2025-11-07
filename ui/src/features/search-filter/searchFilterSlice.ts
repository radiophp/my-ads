import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type CitySelectionMode = 'all' | 'custom';

export type SearchFilterState = {
  provinceId: number | null;
  citySelection: {
    mode: CitySelectionMode;
    cityIds: number[];
  };
};

const initialState: SearchFilterState = {
  provinceId: null,
  citySelection: {
    mode: 'all',
    cityIds: [],
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
    },
    setCitySelectionMode(state, action: PayloadAction<CitySelectionMode>) {
      state.citySelection.mode = action.payload;
      if (action.payload === 'all') {
        state.citySelection.cityIds = [];
      }
    },
    setSelectedCities(state, action: PayloadAction<number[]>) {
      const uniqueIds = Array.from(new Set(action.payload));
      state.citySelection.cityIds = uniqueIds;
      state.citySelection.mode = uniqueIds.length === 0 ? 'all' : 'custom';
    },
    resetSearchFilter: () => initialState,
  },
});

export const { setProvince, setCitySelectionMode, setSelectedCities, resetSearchFilter } =
  searchFilterSlice.actions;

export default searchFilterSlice.reducer;
export { initialState as searchFilterInitialState };
