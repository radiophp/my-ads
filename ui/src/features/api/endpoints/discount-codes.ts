import { apiSlice } from '../baseApi';

import type {
  CreateDiscountCodePayload,
  DiscountCode,
  UpdateDiscountCodePayload,
} from '@/types/discount-codes';

const discountCodesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDiscountCodes: builder.query<DiscountCode[], void>({
      query: () => '/admin/discount-codes',
      providesTags: (result) =>
        result
          ? [
              ...result.map((code) => ({ type: 'DiscountCodes' as const, id: code.id })),
              { type: 'DiscountCodes' as const, id: 'LIST' },
            ]
          : [{ type: 'DiscountCodes' as const, id: 'LIST' }],
    }),
    getDiscountCode: builder.query<DiscountCode, string>({
      query: (id) => `/admin/discount-codes/${id}`,
      providesTags: (result, error, id) => [{ type: 'DiscountCodes', id }],
    }),
    createDiscountCode: builder.mutation<DiscountCode, CreateDiscountCodePayload>({
      query: (body) => ({
        url: '/admin/discount-codes',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'DiscountCodes', id: 'LIST' }],
    }),
    updateDiscountCode: builder.mutation<
      DiscountCode,
      { id: string; body: UpdateDiscountCodePayload }
    >({
      query: ({ id, body }) => ({
        url: `/admin/discount-codes/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'DiscountCodes', id: 'LIST' },
        { type: 'DiscountCodes', id: arg.id },
      ],
    }),
    deleteDiscountCode: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/discount-codes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'DiscountCodes', id: 'LIST' },
        { type: 'DiscountCodes', id },
      ],
    }),
  }),
});

export const {
  useGetDiscountCodesQuery,
  useGetDiscountCodeQuery,
  useCreateDiscountCodeMutation,
  useUpdateDiscountCodeMutation,
  useDeleteDiscountCodeMutation,
} = discountCodesApi;
