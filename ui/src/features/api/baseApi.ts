import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

import { clearAuth, setAuth, deviceChanged } from '@/features/auth/authSlice';
import type { AuthState, ChallengerDevice } from '@/features/auth/authSlice';
import type { AuthResponse } from '@/types/auth';

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:6200/api';

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as { auth?: AuthState };
    const token = state?.auth?.accessToken;

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
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
    const errorBody = result.error.data as Record<string, unknown> | undefined;
    const msgBody = errorBody?.message as Record<string, unknown> | undefined;
    if (msgBody?.code === 'DEVICE_CHANGED') {
      api.dispatch(deviceChanged(msgBody.currentDevice as ChallengerDevice | null | undefined));
      return result;
    }

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
    'DiscountCodes',
    'InviteCodes',
    'AdminUsers',
    'UserSubscription',
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
    'AdminMelkradarSessions',
    'AdminNews',
    'AdminNewsCategories',
    'AdminNewsTags',
    'AdminNewsSources',
    'AdminBlog',
    'AdminBlogCategories',
    'AdminBlogTags',
    'AdminBlogSources',
    'AdminSlides',
    'AdminFeaturedPosts',
    'AdminSeoSettings',
    'AdminWebsiteSettings',
    'PostsWithPhones',
    'UsageLogs',
    'Payments',
    'FeatureBasePrices',
  ],
  endpoints: () => ({}),
});
