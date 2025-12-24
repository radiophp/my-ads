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
import type {
  PaginatedPostsToAnalyze,
  DivarPostListResponse,
  DivarPostSummary,
  DivarPostContactInfo,
  DivarPostCategoryCount,
} from '@/types/divar-posts';
import type {
  RingBinderFolder,
  RingBinderFolderListResponse,
  PostSavedFoldersResponse,
} from '@/types/ring-binder';
import type {
  SavedFilter,
  SavedFilterCreateResponse,
  SavedFilterDeleteResponse,
  SavedFiltersResponse,
  CreateSavedFilterPayload,
  UpdateSavedFilterPayload,
} from '@/types/saved-filters';
import type { NotificationsResponse } from '@/types/notifications';
import type { AdminDivarSession } from '@/types/admin-divar-session';
import type { AdminArkaSession } from '@/types/admin-arka-session';
import type {
  CreateNewsCategoryPayload,
  CreateNewsPayload,
  CreateNewsTagPayload,
  NewsCategory,
  NewsItem,
  NewsListResponse,
  NewsTag,
  NewsSource,
  UpdateNewsCategoryPayload,
  UpdateNewsPayload,
  UpdateNewsTagPayload,
  UpdateNewsSourcePayload,
} from '@/types/news';

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
    'RingBinderFolders',
    'SavedFilters',
    'Notifications',
    'AdminDivarSessions',
    'AdminArkaSessions',
    'AdminNews',
    'AdminNewsCategories',
    'AdminNewsTags',
    'AdminNewsSources',
  ],
  endpoints: (builder) => ({
    getHealth: builder.query<{ status: string }, void>({
      query: () => '/health',
      providesTags: ['Health'],
    }),
    registerPushSubscription: builder.mutation<{ ok: true }, { endpoint: string; p256dh: string; auth: string }>({
      query: (body) => ({
        url: '/notifications/push/subscribe',
        method: 'POST',
        body,
      }),
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
    sendTestNotification: builder.mutation<
      { notificationId: string; status: string; telegramSent?: boolean },
      { userId: string; savedFilterId: string; postId: string; message?: string; sendTelegram?: boolean }
    >({
      query: (body) => ({
        url: '/notifications/admin/test',
        method: 'POST',
        body,
      }),
    }),
    getAdminNews: builder.query<
      NewsListResponse,
      { page?: number; pageSize?: number; search?: string } | void
    >({
      query: (params) => ({
        url: '/admin/news',
        params: params ?? undefined,
      }),
      providesTags: ['AdminNews'],
    }),
    getAdminNewsItem: builder.query<NewsItem, string>({
      query: (id) => `/admin/news/${id}`,
      providesTags: ['AdminNews'],
    }),
    createAdminNews: builder.mutation<NewsItem, CreateNewsPayload>({
      query: (body) => ({
        url: '/admin/news',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminNews'],
    }),
    updateAdminNews: builder.mutation<NewsItem, { id: string; body: UpdateNewsPayload }>({
      query: ({ id, body }) => ({
        url: `/admin/news/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminNews'],
    }),
    deleteAdminNews: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/news/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminNews'],
    }),
    getAdminNewsCategories: builder.query<NewsCategory[], void>({
      query: () => '/admin/news-categories',
      providesTags: ['AdminNewsCategories'],
    }),
    createAdminNewsCategory: builder.mutation<NewsCategory, CreateNewsCategoryPayload>({
      query: (body) => ({
        url: '/admin/news-categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminNewsCategories', 'AdminNews'],
    }),
    updateAdminNewsCategory: builder.mutation<
      NewsCategory,
      { id: string; body: UpdateNewsCategoryPayload }
    >({
      query: ({ id, body }) => ({
        url: `/admin/news-categories/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminNewsCategories', 'AdminNews'],
    }),
    deleteAdminNewsCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/news-categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminNewsCategories', 'AdminNews'],
    }),
    getAdminNewsTags: builder.query<NewsTag[], void>({
      query: () => '/admin/news-tags',
      providesTags: ['AdminNewsTags'],
    }),
    getAdminNewsSources: builder.query<NewsSource[], void>({
      query: () => '/admin/news-sources',
      providesTags: ['AdminNewsSources'],
    }),
    createAdminNewsTag: builder.mutation<NewsTag, CreateNewsTagPayload>({
      query: (body) => ({
        url: '/admin/news-tags',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminNewsTags', 'AdminNews'],
    }),
    updateAdminNewsTag: builder.mutation<NewsTag, { id: string; body: UpdateNewsTagPayload }>({
      query: ({ id, body }) => ({
        url: `/admin/news-tags/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminNewsTags', 'AdminNews'],
    }),
    deleteAdminNewsTag: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/news-tags/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminNewsTags', 'AdminNews'],
    }),
    updateAdminNewsSource: builder.mutation<
      NewsSource,
      { id: string; body: UpdateNewsSourcePayload }
    >({
      query: ({ id, body }) => ({
        url: `/admin/news-sources/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminNewsSources', 'AdminNews'],
    }),
    fetchPostPhone: builder.mutation<{ phoneNumber: string | null }, { postId: string }>({
      query: ({ postId }) => ({
        url: `/divar-posts/${postId}/share-phone`,
        method: 'POST',
        body: {},
      }),
    }),
    fetchPostContactInfo: builder.mutation<DivarPostContactInfo, { postId: string }>({
      query: ({ postId }) => ({
        url: `/divar-posts/${postId}/contact-info`,
        method: 'POST',
        body: {},
      }),
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
    getAdminArkaSessions: builder.query<AdminArkaSession[], void>({
      query: () => '/admin/arka-sessions',
      providesTags: (result) =>
        result
          ? [
              ...result.map((session) => ({
                type: 'AdminArkaSessions' as const,
                id: session.id,
              })),
              { type: 'AdminArkaSessions' as const, id: 'LIST' },
            ]
          : [{ type: 'AdminArkaSessions' as const, id: 'LIST' }],
    }),
    createAdminArkaSession: builder.mutation<
      AdminArkaSession,
      { label?: string; headersRaw: string; active?: boolean; locked?: boolean }
    >({
      query: (body) => ({
        url: '/admin/arka-sessions',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'AdminArkaSessions', id: 'LIST' }, 'AdminStats'],
    }),
    updateAdminArkaSession: builder.mutation<
      AdminArkaSession,
      { id: string; body: Partial<Pick<AdminArkaSession, 'label' | 'headersRaw' | 'active' | 'locked'>> }
    >({
      query: ({ id, body }) => ({
        url: `/admin/arka-sessions/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'AdminArkaSessions', id: 'LIST' },
        { type: 'AdminArkaSessions', id: arg.id },
        'AdminStats',
      ],
    }),
    getAdminDivarSessions: builder.query<AdminDivarSession[], void>({
      query: () => '/admin/divar-sessions',
      providesTags: (result) =>
        result
          ? [
              ...result.map((session) => ({
                type: 'AdminDivarSessions' as const,
                id: session.id,
              })),
              { type: 'AdminDivarSessions' as const, id: 'LIST' },
            ]
          : [{ type: 'AdminDivarSessions' as const, id: 'LIST' }],
    }),
    createAdminDivarSession: builder.mutation<
      AdminDivarSession,
      { phone: string; jwt: string; active?: boolean; locked?: boolean }
    >({
      query: (body) => ({
        url: '/admin/divar-sessions',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'AdminDivarSessions', id: 'LIST' }, 'AdminStats'],
    }),
    updateAdminDivarSession: builder.mutation<
      AdminDivarSession,
      { id: string; body: Partial<Pick<AdminDivarSession, 'phone' | 'jwt' | 'active' | 'locked'>> }
    >({
      query: ({ id, body }) => ({
        url: `/admin/divar-sessions/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'AdminDivarSessions', id: 'LIST' },
        { type: 'AdminDivarSessions', id: arg.id },
        'AdminStats',
      ],
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
    getPublicDivarCategoryFilter: builder.query<DivarCategoryFilterDetail, string>({
      query: (slug) => `/public/divar-categories/${slug}/filters`,
      providesTags: (result, error, slug) => [
        { type: 'DivarCategoryFilters', id: `public-${slug}` },
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
        filters?: Record<string, unknown>;
        ringFolderId?: string | null;
        noteFilter?: 'has' | 'none';
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
        if (params?.filters && Object.keys(params.filters).length > 0) {
          searchParams.set('filters', JSON.stringify(params.filters));
        }
        if (params?.ringFolderId) {
          searchParams.set('ringFolderId', params.ringFolderId);
        }
        if (params?.noteFilter === 'has' || params?.noteFilter === 'none') {
          searchParams.set('noteFilter', params.noteFilter);
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
    getDivarPost: builder.query<DivarPostSummary, string>({
      query: (id) => `/divar-posts/detail/${id}`,
      providesTags: (result, error, id) => [{ type: 'DivarPosts', id }],
    }),
    getDivarPostByCode: builder.query<DivarPostSummary, number>({
      query: (code) => `/divar-posts/code/${code}`,
      providesTags: (result, error, code) => [{ type: 'DivarPosts', id: `code-${code}` }],
    }),
    getDivarPostCategoryCounts: builder.query<DivarPostCategoryCount[], void>({
      query: () => '/divar-posts/category-counts',
    }),
    getRingBinderFolders: builder.query<RingBinderFolderListResponse, void>({
      query: () => '/ring-binders/folders',
      providesTags: (result) =>
        result?.folders && result.folders.length > 0
          ? [
              ...result.folders.map((folder) => ({
                type: 'RingBinderFolders' as const,
                id: folder.id,
              })),
              { type: 'RingBinderFolders' as const, id: 'LIST' },
            ]
          : [{ type: 'RingBinderFolders' as const, id: 'LIST' }],
    }),
    createRingBinderFolder: builder.mutation<RingBinderFolder, { name: string }>({
      query: (body) => ({
        url: '/ring-binders/folders',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'RingBinderFolders', id: 'LIST' }],
    }),
    updateRingBinderFolder: builder.mutation<RingBinderFolder, { id: string; name: string }>({
      query: ({ id, name }) => ({
        url: `/ring-binders/folders/${id}`,
        method: 'PATCH',
        body: { name },
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'RingBinderFolders', id: arg.id },
        { type: 'RingBinderFolders', id: 'LIST' },
      ],
    }),
    savePostToRingBinderFolder: builder.mutation<
      { success: boolean },
      { folderId: string; postId: string }
    >({
      query: ({ folderId, postId }) => ({
        url: `/ring-binders/folders/${folderId}/posts`,
        method: 'POST',
        body: { postId },
      }),
    }),
    removePostFromRingBinderFolder: builder.mutation<
      { success: boolean },
      { folderId: string; postId: string }
    >({
      query: ({ folderId, postId }) => ({
        url: `/ring-binders/folders/${folderId}/posts/${postId}`,
        method: 'DELETE',
      }),
    }),
    getPostSavedFolders: builder.query<PostSavedFoldersResponse, string>({
      query: (postId) => `/ring-binders/posts/${postId}`,
      providesTags: (result, error, postId) => [{ type: 'RingBinderFolders', id: `post-${postId}` }],
    }),
    upsertPostNote: builder.mutation<
      { content: string | null; updatedAt?: string },
      { postId: string; content: string }
    >({
      query: ({ postId, content }) => ({
        url: `/ring-binders/posts/${postId}/note`,
        method: 'PUT',
        body: { content },
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'RingBinderFolders', id: `post-${arg.postId}` },
      ],
    }),
    deletePostNote: builder.mutation<{ success: boolean }, { postId: string }>({
      query: ({ postId }) => ({
        url: `/ring-binders/posts/${postId}/note`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'RingBinderFolders', id: `post-${arg.postId}` },
      ],
    }),
    deleteRingBinderFolder: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/ring-binders/folders/${id}`,
        method: 'DELETE',
        body: {},
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'RingBinderFolders', id },
        { type: 'RingBinderFolders', id: 'LIST' },
      ],
    }),
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
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'SavedFilters', id },
        { type: 'SavedFilters', id: 'LIST' },
      ],
    }),
    getNotifications: builder.query<NotificationsResponse, { cursor?: string; limit?: number } | void>({
      query: (params) => {
        const query: Record<string, string> = {};
        if (params?.cursor) {
          query.cursor = params.cursor;
        }
        if (params?.limit) {
          query.limit = String(params.limit);
        }
        return {
          url: '/notifications',
          params: query,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((item) => ({
                type: 'Notifications' as const,
                id: item.id,
              })),
              { type: 'Notifications' as const, id: 'LIST' },
            ]
          : [{ type: 'Notifications' as const, id: 'LIST' }],
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
  useGetPublicDivarCategoryFilterQuery,
  useGetAdminDashboardStatsQuery,
  useGetAdminArkaSessionsQuery,
  useCreateAdminArkaSessionMutation,
  useUpdateAdminArkaSessionMutation,
  useGetAdminDivarSessionsQuery,
  useCreateAdminDivarSessionMutation,
  useUpdateAdminDivarSessionMutation,
  useGetAdminNewsQuery,
  useGetAdminNewsItemQuery,
  useCreateAdminNewsMutation,
  useUpdateAdminNewsMutation,
  useDeleteAdminNewsMutation,
  useGetAdminNewsCategoriesQuery,
  useCreateAdminNewsCategoryMutation,
  useUpdateAdminNewsCategoryMutation,
  useDeleteAdminNewsCategoryMutation,
  useGetAdminNewsTagsQuery,
  useCreateAdminNewsTagMutation,
  useUpdateAdminNewsTagMutation,
  useDeleteAdminNewsTagMutation,
  useGetAdminNewsSourcesQuery,
  useUpdateAdminNewsSourceMutation,
  useGetPostsToAnalyzeQuery,
  useGetDivarPostsQuery,
  useLazyGetDivarPostsQuery,
  useGetDivarPostQuery,
  useLazyGetDivarPostByCodeQuery,
  useGetDivarPostCategoryCountsQuery,
  useFetchPostPhoneMutation,
  useFetchPostContactInfoMutation,
  useGetRingBinderFoldersQuery,
  useCreateRingBinderFolderMutation,
  useUpdateRingBinderFolderMutation,
  useSavePostToRingBinderFolderMutation,
  useRemovePostFromRingBinderFolderMutation,
  useGetPostSavedFoldersQuery,
  useUpsertPostNoteMutation,
  useDeletePostNoteMutation,
  useDeleteRingBinderFolderMutation,
  useGetSavedFiltersQuery,
  useCreateSavedFilterMutation,
  useUpdateSavedFilterMutation,
  useDeleteSavedFilterMutation,
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useSendTestNotificationMutation,
  useRegisterPushSubscriptionMutation,
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
