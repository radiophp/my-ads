import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { apiSlice } from '@/features/api/apiSlice';
import counterReducer from '@/features/counter/counterSlice';
import authReducer from '@/features/auth/authSlice';
import searchFilterReducer, {
  type SearchFilterState,
  type SearchFilterSliceState,
  type CategoryFilterBuckets,
  type CategoryFilterValue,
  searchFilterInitialState,
} from '@/features/search-filter/searchFilterSlice';
import notificationsReducer from '@/features/notifications/notificationsSlice';

type StoredSearchFilterState = Partial<SearchFilterState> & {
  categorySlug?: string | null;
  categoryDepth?: number | null;
  categorySelection?: Partial<SearchFilterState['categorySelection']>;
  districtSelection?: Partial<SearchFilterState['districtSelection']>;
  ringBinderFolderId?: string | null;
  noteFilter?: SearchFilterState['noteFilter'];
};

const SEARCH_FILTER_STORAGE_KEY = 'search-filter-state';

const loadSearchFilterState = (): SearchFilterSliceState => {
  try {
    const storedValue =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(SEARCH_FILTER_STORAGE_KEY)
        : null;
    if (!storedValue) {
      return { ...searchFilterInitialState, persistNonce: 0 };
    }

    const parsed = JSON.parse(storedValue) as StoredSearchFilterState;
    const provinceId =
      typeof parsed.provinceId === 'number' ? parsed.provinceId : null;
    const cityIds = Array.isArray(parsed.citySelection?.cityIds)
      ? parsed.citySelection.cityIds.filter((id): id is number => typeof id === 'number')
      : [];
    const cityMode =
      parsed.citySelection?.mode === 'custom' && cityIds.length > 0 ? 'custom' : 'all';
    const storedDistrict: Partial<SearchFilterState['districtSelection']> =
      parsed.districtSelection ?? {};
    const districtIds = Array.isArray(storedDistrict.districtIds)
      ? storedDistrict.districtIds.filter((id): id is number => typeof id === 'number')
      : [];
    const districtMode =
      storedDistrict.mode === 'custom' && districtIds.length > 0 ? 'custom' : 'all';

    const storedCategory: Partial<SearchFilterState['categorySelection']> =
      parsed.categorySelection ?? {};
    const legacyCategorySlug =
      typeof parsed.categorySlug === 'string' && parsed.categorySlug.length > 0
        ? parsed.categorySlug
        : null;
    const legacyCategoryDepth =
      typeof parsed.categoryDepth === 'number' && Number.isFinite(parsed.categoryDepth)
        ? parsed.categoryDepth
        : null;
    const categorySlug =
      typeof storedCategory.slug === 'string' && storedCategory.slug.length > 0
        ? storedCategory.slug
        : legacyCategorySlug;
    const categoryDepth =
      typeof storedCategory.depth === 'number' && Number.isFinite(storedCategory.depth)
        ? storedCategory.depth
        : legacyCategoryDepth;

    return {
      provinceId,
      citySelection: {
        mode: cityMode,
        cityIds: cityMode === 'custom' ? cityIds : [],
      },
      districtSelection: {
        mode: districtMode,
        districtIds: districtMode === 'custom' ? districtIds : [],
      },
      categorySelection: {
        slug: categorySlug,
        depth: categoryDepth,
      },
      categoryFilters: parseCategoryFilters(parsed.categoryFilters),
      ringBinderFolderId:
        typeof parsed.ringBinderFolderId === 'string' && parsed.ringBinderFolderId.length > 0
          ? parsed.ringBinderFolderId
          : null,
      noteFilter:
        parsed.noteFilter === 'has' || parsed.noteFilter === 'none' ? parsed.noteFilter : 'all',
      persistNonce: 0,
    };
  } catch {
    return { ...searchFilterInitialState, persistNonce: 0 };
  }
};

const persistSearchFilterState = (state: SearchFilterSliceState): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const { persistNonce: _persistNonce, ...persistable } = state;
    window.localStorage.setItem(SEARCH_FILTER_STORAGE_KEY, JSON.stringify(persistable));
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
    notifications: notificationsReducer,
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
  let lastPersistNonce: number | null = null;
  store.subscribe(() => {
    const { searchFilter } = store.getState();
    const currentNonce = searchFilter.persistNonce;
    if (lastPersistNonce === null) {
      lastPersistNonce = currentNonce;
      return;
    }
    if (currentNonce !== lastPersistNonce) {
      lastPersistNonce = currentNonce;
      persistSearchFilterState(searchFilter);
    }
  });
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCategoryFilters(input: unknown): CategoryFilterBuckets {
  if (!isRecord(input)) {
    return {};
  }
  const result: CategoryFilterBuckets = {};
  for (const [slug, value] of Object.entries(input)) {
    if (typeof slug !== 'string' || !isRecord(value)) {
      continue;
    }
    const normalized: Record<string, CategoryFilterValue> = {};
    for (const [key, raw] of Object.entries(value)) {
      if (typeof key !== 'string') {
        continue;
      }
      const parsed = parseCategoryFilterValue(raw);
      if (parsed) {
        normalized[key] = parsed;
      }
    }
    if (Object.keys(normalized).length > 0) {
      result[slug] = normalized;
    }
  }
  return result;
}

function parseCategoryFilterValue(raw: unknown): CategoryFilterValue | null {
  if (!isRecord(raw) || typeof raw.kind !== 'string') {
    return null;
  }
  switch (raw.kind) {
    case 'numberRange': {
      const min = typeof raw.min === 'number' && Number.isFinite(raw.min) ? raw.min : undefined;
      const max = typeof raw.max === 'number' && Number.isFinite(raw.max) ? raw.max : undefined;
      if (min === undefined && max === undefined) {
        return null;
      }
      return { kind: 'numberRange', min, max };
    }
    case 'multiSelect': {
      if (!Array.isArray(raw.values)) {
        return null;
      }
      const values = raw.values.filter((value): value is string => typeof value === 'string');
      return values.length > 0 ? { kind: 'multiSelect', values } : null;
    }
    case 'singleSelect': {
      const value = typeof raw.value === 'string' && raw.value.length > 0 ? raw.value : null;
      return value ? { kind: 'singleSelect', value } : null;
    }
    case 'boolean': {
      if (typeof raw.value !== 'boolean') {
        return null;
      }
      return raw.value ? { kind: 'boolean', value: true } : null;
    }
    default:
      return null;
  }
}
