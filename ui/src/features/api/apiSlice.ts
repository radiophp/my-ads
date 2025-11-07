import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import type { AuthResponse, CurrentUser, SuccessResponse } from '@/types/auth';
import type { City, District, Province } from '@/types/location';
import type {
  CreatePackagePayload,
  SubscriptionPackage,
  UpdatePackagePayload,
} from '@/types/packages';
import type { DivarCategory, DivarCategoryFilterDetail, DivarCategoryFilterSummary } from '@/types/divar-category';
import type { AdminDashboardStats } from '@/types/admin';

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:6200/api';

const skipContentTypeEndpoints = new Set([
  'uploadProfileImage',
  'uploadTempProfileImage',
  'uploadPublicImage',
]);

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState, endpoint }) => {
      const state = getState() as { auth?: { accessToken?: string | null } };
      const token = state?.auth?.accessToken;

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      if (!headers.has('Content-Type') && !skipContentTypeEndpoints.has(endpoint)) {
        headers.set('Content-Type', 'application/json');
      }

      return headers;
    },
    credentials: 'include',
  }),
  tagTypes: [
    'Health',
    'User',
    'Locations',
    'Packages',
    'DivarCategories',
    'AdminStats',
    'DivarCategoryFilters',
  ],
  endpoints: (builder) => ({
    getHealth: builder.query<{ status: string }, void>({
      query: () => '/health',
      providesTags: ['Health'],
    }),
    requestOtp: builder.mutation<SuccessResponse, { phone: string }>({
      query: (body) => ({
        url: '/auth/request-otp',
        method: 'POST',
        body,
      }),
    }),
    verifyOtp: builder.mutation<AuthResponse, { phone: string; code: string }>({
      query: (body) => ({
        url: '/auth/verify-otp',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    getCurrentUser: builder.query<CurrentUser, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    logout: builder.mutation<SuccessResponse, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['User'],
    }),
    updateCurrentUser: builder.mutation<CurrentUser, UpdateCurrentUserPayload>({
      query: (body) => ({
        url: '/auth/me',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    getProvinces: builder.query<Province[], void>({
      query: () => '/provinces',
      providesTags: ['Locations'],
    }),
    getCities: builder.query<City[], number | void>({
      query: (provinceId) =>
        provinceId ? `/cities?provinceId=${provinceId}` : '/cities',
      providesTags: ['Locations'],
    }),
    getDistricts: builder.query<District[], number | void>({
      query: (cityId) => (cityId ? `/districts?cityId=${cityId}` : '/districts'),
      providesTags: ['Locations'],
    }),
    uploadProfileImage: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/uploads',
        method: 'POST',
        body: formData,
      }),
    }),
    uploadTempProfileImage: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/uploads/temp',
        method: 'POST',
        body: formData,
      }),
    }),
    deleteTempProfileImage: builder.mutation<void, { key: string }>({
      query: ({ key }) => ({
        url: '/uploads/temp',
        method: 'DELETE',
        body: { key },
      }),
    }),
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
    uploadPublicImage: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/uploads/public',
        method: 'POST',
        body: formData,
      }),
    }),
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
    getAdminDashboardStats: builder.query<AdminDashboardStats, void>({
      query: () => '/admin-panel/stats',
      providesTags: ['AdminStats'],
    }),
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
  }),
});

export const {
  useGetHealthQuery,
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useGetCurrentUserQuery,
  useLogoutMutation,
  useUpdateCurrentUserMutation,
  useGetProvincesQuery,
  useGetCitiesQuery,
  useGetDistrictsQuery,
  useUploadProfileImageMutation,
  useUploadTempProfileImageMutation,
  useDeleteTempProfileImageMutation,
  useGetPackagesQuery,
  useGetPackageQuery,
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeletePackageMutation,
  useUploadPublicImageMutation,
  useGetDivarCategoriesQuery,
  useUpdateDivarCategoryAllowPostingMutation,
  useGetDivarCategoryFiltersQuery,
  useGetDivarCategoryFilterQuery,
  useGetAdminDashboardStatsQuery,
} = apiSlice;

type UpdateCurrentUserPayload = Partial<{
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  provinceId: number | null;
  cityId: number | null;
  profileImageUrl: string | null;
}>;

type UploadResponse = {
  bucket: string;
  key: string;
  eTag?: string;
  url: string;
  originalName?: string;
  contentType?: string;
};
