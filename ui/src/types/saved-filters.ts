import type { SearchFilterState } from '@/features/search-filter/searchFilterSlice';

export type SavedFilter = {
  id: string;
  name: string;
  payload: SearchFilterState;
  createdAt: string;
  updatedAt: string;
};

export type SavedFiltersResponse = {
  filters: SavedFilter[];
  limit: number;
  remaining: number;
};

export type SavedFilterCreateResponse = {
  filter: SavedFilter;
  limit: number;
  remaining: number;
};

export type SavedFilterDeleteResponse = {
  success: boolean;
  limit: number;
  remaining: number;
};

export type CreateSavedFilterPayload = {
  name: string;
  payload: SearchFilterState;
};

export type UpdateSavedFilterPayload = Partial<CreateSavedFilterPayload>;
