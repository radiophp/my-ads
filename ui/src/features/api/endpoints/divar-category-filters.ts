import { apiSlice } from '../baseApi';

import type {
  DivarCategoryFilterDetail,
  DivarCategoryFilterSummary,
} from '@/types/divar-category';

const divarCategoryFiltersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDivarCategoryFilters: builder.query<DivarCategoryFilterSummary[], void>({
      query: () => '/admin/divar-category-filters',
      providesTags: ['DivarCategoryFilters'],
    }),
    getDivarCategoryFilter: builder.query<DivarCategoryFilterDetail, string>({
      query: (slug) => `/admin/divar-category-filters/${slug}`,
      providesTags: (result, error, slug) => [
        { type: 'DivarCategoryFilters', id: slug },
        'DivarCategoryFilters',
      ],
    }),
    getPublicDivarCategoryFilter: builder.query<DivarCategoryFilterDetail, string>({
      query: (slug) => `/public/divar-categories/${slug}/filters`,
      providesTags: (result, error, slug) => [
        { type: 'DivarCategoryFilters', id: `public-${slug}` },
        'DivarCategoryFilters',
      ],
    }),
  }),
});

export const {
  useGetDivarCategoryFiltersQuery,
  useGetDivarCategoryFilterQuery,
  useGetPublicDivarCategoryFilterQuery,
} = divarCategoryFiltersApi;
