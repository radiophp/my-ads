import type { SearchFilterState } from '@/features/search-filter/searchFilterSlice';

export type SavedFilter = {
  id: string;
  name: string;
  payload: SearchFilterState;
  notificationsEnabled: boolean;
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
  notificationsEnabled?: boolean;
};

export type UpdateSavedFilterPayload = Partial<CreateSavedFilterPayload>;
