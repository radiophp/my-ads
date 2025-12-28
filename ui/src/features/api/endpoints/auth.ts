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
  }),
});

export const {
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useGetCurrentUserQuery,
  useLogoutMutation,
  useUpdateCurrentUserMutation,
} = authApi;
