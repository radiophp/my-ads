import { apiSlice } from '../baseApi';

import type { DivarCategory } from '@/types/divar-category';

const divarCategoriesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDivarCategories: builder.query<DivarCategory[], void>({
      query: () => '/admin/divar-categories',
      providesTags: (result) =>
        result
          ? [
              ...result.map((category) => ({
                type: 'DivarCategories' as const,
                id: category.id,
              })),
              { type: 'DivarCategories' as const, id: 'LIST' },
            ]
          : [{ type: 'DivarCategories' as const, id: 'LIST' }],
    }),
    getPublicDivarCategories: builder.query<DivarCategory[], void>({
      query: () => '/public/divar-categories',
      providesTags: (result) =>
        result
          ? [
              ...result.map((category) => ({
                type: 'DivarCategories' as const,
                id: category.id,
              })),
              { type: 'DivarCategories' as const, id: 'LIST' },
            ]
          : [{ type: 'DivarCategories' as const, id: 'LIST' }],
    }),
    updateDivarCategoryAllowPosting: builder.mutation<
      DivarCategory,
      { id: string; allowPosting: boolean }
    >({
      query: ({ id, allowPosting }) => ({
        url: `/admin/divar-categories/${id}/allow-posting`,
        method: 'PATCH',
        body: { allowPosting },
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'DivarCategories', id: arg.id },
        { type: 'DivarCategories', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetDivarCategoriesQuery,
  useGetPublicDivarCategoriesQuery,
  useUpdateDivarCategoryAllowPostingMutation,
} = divarCategoriesApi;
