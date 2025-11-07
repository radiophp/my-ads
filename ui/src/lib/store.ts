import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { apiSlice } from '@/features/api/apiSlice';
import counterReducer from '@/features/counter/counterSlice';
import authReducer from '@/features/auth/authSlice';
import searchFilterReducer, {
  type SearchFilterState,
  searchFilterInitialState,
} from '@/features/search-filter/searchFilterSlice';

const SEARCH_FILTER_STORAGE_KEY = 'search-filter-state';

const loadSearchFilterState = (): SearchFilterState => {
  try {
    const storedValue =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(SEARCH_FILTER_STORAGE_KEY)
        : null;
    if (!storedValue) {
      return searchFilterInitialState;
    }

    const parsed = JSON.parse(storedValue) as Partial<SearchFilterState>;
    const provinceId =
      typeof parsed.provinceId === 'number' ? parsed.provinceId : null;
    const cityIds = Array.isArray(parsed.citySelection?.cityIds)
      ? parsed.citySelection.cityIds.filter((id): id is number => typeof id === 'number')
      : [];
    const mode = parsed.citySelection?.mode === 'custom' && cityIds.length > 0 ? 'custom' : 'all';

    return {
      provinceId,
      citySelection: {
        mode,
        cityIds: mode === 'custom' ? cityIds : [],
      },
    };
  } catch {
    return searchFilterInitialState;
  }
};

const persistSearchFilterState = (state: SearchFilterState): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(SEARCH_FILTER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore persistence failures (e.g., private mode).
  }
};

const preloadedSearchFilterState =
  typeof window === 'undefined' ? undefined : loadSearchFilterState();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    counter: counterReducer,
    searchFilter: searchFilterReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  preloadedState: preloadedSearchFilterState
    ? { searchFilter: preloadedSearchFilterState }
    : undefined,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(apiSlice.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

if (typeof window !== 'undefined') {
  setupListeners(store.dispatch);
  store.subscribe(() => {
    const { searchFilter } = store.getState();
    persistSearchFilterState(searchFilter);
  });
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
