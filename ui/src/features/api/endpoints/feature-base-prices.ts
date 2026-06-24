import { apiSlice } from '../baseApi';
import type {
  FeatureBasePrice,
  CreateFeatureBasePricePayload,
  UpdateFeatureBasePricePayload,
  PackagePricingBreakdown,
} from '@/types/feature-base-prices';

const featureBasePricesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFeatureBasePrices: builder.query<FeatureBasePrice[], void>({
      query: () => '/admin/feature-base-prices',
      providesTags: (result) =>
        result
          ? [
              ...result.map((fbp) => ({ type: 'FeatureBasePrices' as const, id: fbp.id })),
              { type: 'FeatureBasePrices' as const, id: 'LIST' },
            ]
          : [{ type: 'FeatureBasePrices' as const, id: 'LIST' }],
    }),
    getFeatureBasePrice: builder.query<FeatureBasePrice, string>({
      query: (id) => `/admin/feature-base-prices/${id}`,
      providesTags: (result, error, id) => [{ type: 'FeatureBasePrices', id }],
    }),
    createFeatureBasePrice: builder.mutation<FeatureBasePrice, CreateFeatureBasePricePayload>({
      query: (body) => ({
        url: '/admin/feature-base-prices',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'FeatureBasePrices', id: 'LIST' }],
    }),
    updateFeatureBasePrice: builder.mutation<
      FeatureBasePrice,
      { id: string; body: UpdateFeatureBasePricePayload }
    >({
      query: ({ id, body }) => ({
        url: `/admin/feature-base-prices/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'FeatureBasePrices', id: 'LIST' },
        { type: 'FeatureBasePrices', id: arg.id },
      ],
    }),
    deleteFeatureBasePrice: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/feature-base-prices/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'FeatureBasePrices', id: 'LIST' },
        { type: 'FeatureBasePrices', id },
      ],
    }),
    recalculatePricing: builder.query<PackagePricingBreakdown, string>({
      query: (packageId) => `/admin/feature-base-prices/recalculate/${packageId}`,
      providesTags: (result, error, packageId) => [{ type: 'FeatureBasePrices' as const, id: `recalc-${packageId}` }],
    }),
    applySnapshots: builder.mutation<void, string>({
      query: (packageId) => ({
        url: `/admin/feature-base-prices/apply-snapshots/${packageId}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, packageId) => [
        { type: 'FeatureBasePrices' as const, id: `recalc-${packageId}` },
      ],
    }),
  }),
});

export const {
  useGetFeatureBasePricesQuery,
  useGetFeatureBasePriceQuery,
  useCreateFeatureBasePriceMutation,
  useUpdateFeatureBasePriceMutation,
  useDeleteFeatureBasePriceMutation,
  useRecalculatePricingQuery,
  useApplySnapshotsMutation,
} = featureBasePricesApi;
