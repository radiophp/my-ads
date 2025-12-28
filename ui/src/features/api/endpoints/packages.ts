import { apiSlice } from '../baseApi';

import type {
  CreatePackagePayload,
  SubscriptionPackage,
  UpdatePackagePayload,
} from '@/types/packages';

const packagesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPackages: builder.query<SubscriptionPackage[], void>({
      query: () => '/admin/packages',
      providesTags: (result) =>
        result
          ? [
              ...result.map((pkg) => ({ type: 'Packages' as const, id: pkg.id })),
              { type: 'Packages' as const, id: 'LIST' },
            ]
          : [{ type: 'Packages' as const, id: 'LIST' }],
    }),
    getPackage: builder.query<SubscriptionPackage, string>({
      query: (id) => `/admin/packages/${id}`,
      providesTags: (result, error, id) => [{ type: 'Packages', id }],
    }),
    createPackage: builder.mutation<SubscriptionPackage, CreatePackagePayload>({
      query: (body) => ({
        url: '/admin/packages',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Packages', id: 'LIST' }],
    }),
    updatePackage: builder.mutation<
      SubscriptionPackage,
      { id: string; body: UpdatePackagePayload }
    >({
      query: ({ id, body }) => ({
        url: `/admin/packages/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'Packages', id: 'LIST' },
        { type: 'Packages', id: arg.id },
      ],
    }),
    deletePackage: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/packages/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Packages', id: 'LIST' },
        { type: 'Packages', id },
      ],
    }),
  }),
});

export const {
  useGetPackagesQuery,
  useGetPackageQuery,
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeletePackageMutation,
} = packagesApi;
