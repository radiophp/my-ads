import { apiSlice } from '../baseApi';

import type { AuthResponse, CurrentUser, SuccessResponse } from '@/types/auth';

type UpdateCurrentUserPayload = Partial<{
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  provinceId: number | null;
  cityId: number | null;
  profileImageUrl: string | null;
}>;

const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    requestOtp: builder.mutation<SuccessResponse, { phone: string; deviceInfo?: string }>({
      query: (body) => ({
        url: '/auth/request-otp',
        method: 'POST',
        body,
      }),
    }),
    baleLogin: builder.mutation<AuthResponse, { phone: string }>({
      query: (body) => ({
        url: '/auth/bale-login',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
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
  }),
});

export const {
  useRequestOtpMutation,
  useBaleLoginMutation,
  useVerifyOtpMutation,
  useGetCurrentUserQuery,
  useLogoutMutation,
  useUpdateCurrentUserMutation,
} = authApi;
