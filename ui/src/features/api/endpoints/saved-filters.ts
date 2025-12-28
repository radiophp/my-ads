import { apiSlice } from '../baseApi';

import type {
  CreateSavedFilterPayload,
  SavedFilter,
  SavedFilterCreateResponse,
  SavedFilterDeleteResponse,
  SavedFiltersResponse,
  UpdateSavedFilterPayload,
} from '@/types/saved-filters';

const savedFiltersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSavedFilters: builder.query<SavedFiltersResponse, void>({
      query: () => '/saved-filters',
      providesTags: (result) =>
        result
          ? [
              ...result.filters.map((filter) => ({ type: 'SavedFilters' as const, id: filter.id })),
              { type: 'SavedFilters' as const, id: 'LIST' },
            ]
          : [{ type: 'SavedFilters' as const, id: 'LIST' }],
    }),
    createSavedFilter: builder.mutation<SavedFilterCreateResponse, CreateSavedFilterPayload>({
      query: (body) => ({
        url: '/saved-filters',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SavedFilters', id: 'LIST' }],
    }),
    updateSavedFilter: builder.mutation<SavedFilter, { id: string; body: UpdateSavedFilterPayload }>({
      query: ({ id, body }) => ({
        url: `/saved-filters/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'SavedFilters', id: arg.id },
        { type: 'SavedFilters', id: 'LIST' },
      ],
    }),
    deleteSavedFilter: builder.mutation<SavedFilterDeleteResponse, string>({
      query: (id) => ({
        url: `/saved-filters/${id}`,
        method: 'DELETE',
        body: {},
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'SavedFilters', id },
        { type: 'SavedFilters', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetSavedFiltersQuery,
  useCreateSavedFilterMutation,
  useUpdateSavedFilterMutation,
  useDeleteSavedFilterMutation,
} = savedFiltersApi;
