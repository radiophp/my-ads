import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

import { clearAuth, setAuth } from '@/features/auth/authSlice';
import type { AuthState } from '@/features/auth/authSlice';
import type { AuthResponse, CurrentUser, SuccessResponse } from '@/types/auth';
import type { City, District, Province } from '@/types/location';
import type {
  CreatePackagePayload,
  SubscriptionPackage,
  UpdatePackagePayload,
} from '@/types/packages';
import type {
  DivarCategory,
  DivarCategoryFilterDetail,
  DivarCategoryFilterSummary,
} from '@/types/divar-category';
import type { AdminDashboardStats } from '@/types/admin';
import type { PaginatedPostsToAnalyze, DivarPostListResponse } from '@/types/divar-posts';

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:6200/api';

const skipContentTypeEndpoints = new Set([
  'uploadProfileImage',
  'uploadTempProfileImage',
  'uploadPublicImage',
]);

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers, { getState, endpoint }) => {
    const state = getState() as { auth?: AuthState };
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
});

let refreshPromise: Promise<AuthResponse | null> | null = null;

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const state = api.getState() as { auth?: AuthState };
    const refreshToken = state?.auth?.refreshToken;

    if (!refreshToken) {
      api.dispatch(clearAuth());
      return result;
    }

    if (!refreshPromise) {
      refreshPromise = (async () => {
        const refreshResult = await rawBaseQuery(
          {
            url: '/auth/refresh',
            method: 'POST',
            body: { refreshToken },
          },
          api,
          extraOptions,
        );

        if (refreshResult.error) {
          return null;
        }

        return refreshResult.data as AuthResponse;
      })();
    }

    const currentRefreshPromise = refreshPromise;
    const refreshedAuth = await currentRefreshPromise;
    if (refreshPromise === currentRefreshPromise) {
      refreshPromise = null;
    }

    if (refreshedAuth) {
      api.dispatch(setAuth(refreshedAuth));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(clearAuth());
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Health',
    'User',
    'Locations',
    'Packages',
    'DivarCategories',
    'AdminStats',
    'DivarCategoryFilters',
    'PostsToAnalyze',
    'DivarPosts',
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
      query: (provinceId) => (provinceId ? `/cities?provinceId=${provinceId}` : '/cities'),
      providesTags: ['Locations'],
    }),
    getDistricts: builder.query<District[], number | number[] | void>({
      query: (cityArg) => {
        if (cityArg === undefined || cityArg === null) {
          return '/districts';
        }

        if (Array.isArray(cityArg)) {
          const filtered = cityArg.filter((id) => typeof id === 'number');
          if (filtered.length === 0) {
            return '/districts';
          }
          return `/districts?cityIds=${filtered.join(',')}`;
        }

        return `/districts?cityId=${cityArg}`;
      },
      providesTags: ['Locations'],
    }),
    updateProvinceAllowPosting: builder.mutation<Province, { id: number; allowPosting: boolean }>({
      query: ({ id, allowPosting }) => ({
        url: `/provinces/${id}/allow-posting`,
        method: 'PATCH',
        body: { allowPosting },
      }),
      invalidatesTags: ['Locations'],
    }),
    updateCityAllowPosting: builder.mutation<City, { id: number; allowPosting: boolean }>({
      query: ({ id, allowPosting }) => ({
        url: `/cities/${id}/allow-posting`,
        method: 'PATCH',
        body: { allowPosting },
      }),
      invalidatesTags: ['Locations'],
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
    getPostsToAnalyze: builder.query<PaginatedPostsToAnalyze, number | void>({
      query: (page = 1) => `/admin/divar-posts/to-analyze?page=${page}`,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((item) => ({ type: 'PostsToAnalyze' as const, id: item.id })),
              { type: 'PostsToAnalyze' as const, id: `PAGE-${result.meta.page}` },
            ]
          : [{ type: 'PostsToAnalyze', id: 'LIST' }],
    }),
    getDivarPosts: builder.query<
      DivarPostListResponse,
      {
        cursor?: string | null;
        limit?: number;
        provinceId?: number;
        cityIds?: number[];
        districtIds?: number[];
        categorySlug?: string | null;
        categoryDepth?: number | null;
      } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.cursor) {
          searchParams.set('cursor', params.cursor);
        }
        if (params?.limit) {
          searchParams.set('limit', String(params.limit));
        }
        if (typeof params?.provinceId === 'number') {
          searchParams.set('provinceId', String(params.provinceId));
        }
        if (params?.cityIds && params.cityIds.length > 0) {
          searchParams.set('cityIds', params.cityIds.join(','));
        }
        if (params?.districtIds && params.districtIds.length > 0) {
          searchParams.set('districtIds', params.districtIds.join(','));
        }
        if (params?.categorySlug) {
          searchParams.set('categorySlug', params.categorySlug);
        }
        if (typeof params?.categoryDepth === 'number') {
          searchParams.set('categoryDepth', String(params.categoryDepth));
        }
        const qs = searchParams.toString();
        return `/divar-posts${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((item) => ({
                type: 'DivarPosts' as const,
                id: item.id,
              })),
              { type: 'DivarPosts' as const, id: result.nextCursor ?? 'END' },
            ]
          : [{ type: 'DivarPosts' as const, id: 'LIST' }],
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
  useUpdateProvinceAllowPostingMutation,
  useUpdateCityAllowPostingMutation,
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
  useGetPostsToAnalyzeQuery,
  useGetDivarPostsQuery,
  useLazyGetDivarPostsQuery,
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
