import { apiSlice } from '../baseApi';

import type { AuthResponse, CurrentUser, SuccessResponse, DeviceInfo } from '@/types/auth';

export type ActiveDeviceInfo = {
  deviceId: string;
  name: string | null;
  type: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
};

export type BaleMiniAppAuthResponse =
  | { status: 'phone_required'; baleUserId?: number }
  | (AuthResponse & { status: 'authenticated' })
  | {
      status: 'confirm_device';
      pendingSessionToken: string;
      currentDevice: { name: string | null; type: string | null; ipAddress: string | null; lastActiveAt: string } | null;
      requiresDeviceSelection?: boolean;
      activeDevices?: ActiveDeviceInfo[];
    };

type UpdateCurrentUserPayload = Partial<{
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  provinceId: number | null;
  cityId: number | null;
  profileImageUrl: string | null;
}>;

type VerifyOtpPayload = {
  phone: string;
  code: string;
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  userAgent?: string;
};

type ConfirmDevicePayload = {
  pendingSessionToken: string;
  deviceToReplace?: string;
};

type CancelDevicePayload = {
  pendingSessionToken: string;
};

export type ConfirmDeviceResponse = {
  status: 'confirm_device';
  pendingSessionToken: string;
  currentDevice: {
    name: string | null;
    type: string | null;
    ipAddress: string | null;
    lastActiveAt: string;
  } | null;
  requiresDeviceSelection?: boolean;
  activeDevices?: ActiveDeviceInfo[];
};

export type AuthenticatedResponse = AuthResponse & {
  status: 'authenticated';
};

export type VerifyOtpResponse = AuthenticatedResponse | ConfirmDeviceResponse;

const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    requestOtp: builder.mutation<SuccessResponse, { phone: string; deviceInfo?: string; turnstileToken?: string }>({
      query: (body) => ({
        url: '/auth/request-otp',
        method: 'POST',
        body,
      }),
    }),
    baleLogin: builder.mutation<VerifyOtpResponse, { phone: string; deviceId?: string; deviceName?: string; deviceType?: string; userAgent?: string }>({
      query: (body) => ({
        url: '/auth/bale-login',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    verifyOtp: builder.mutation<VerifyOtpResponse, VerifyOtpPayload>({
      query: (body) => ({
        url: '/auth/verify-otp',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    confirmDevice: builder.mutation<AuthenticatedResponse, ConfirmDevicePayload>({
      query: (body) => ({
        url: '/auth/confirm-device',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    baleMiniAppAuth: builder.mutation<BaleMiniAppAuthResponse, { initData: string; phone?: string; deviceId?: string; deviceName?: string; deviceType?: string; userAgent?: string }>({
      query: (body) => ({
        url: '/auth/bale-miniapp/auth',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    cancelDevice: builder.mutation<SuccessResponse, CancelDevicePayload>({
      query: (body) => ({
        url: '/auth/cancel-device',
        method: 'POST',
        body,
      }),
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
    getDevices: builder.query<DeviceInfo[], void>({
      query: () => '/auth/devices',
      providesTags: ['User'],
    }),
    deleteDevice: builder.mutation<SuccessResponse, string>({
      query: (deviceId) => ({
        url: `/auth/devices/${deviceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useRequestOtpMutation,
  useBaleLoginMutation,
  useVerifyOtpMutation,
  useConfirmDeviceMutation,
  useCancelDeviceMutation,
  useBaleMiniAppAuthMutation,
  useGetCurrentUserQuery,
  useLogoutMutation,
  useUpdateCurrentUserMutation,
  useGetDevicesQuery,
  useDeleteDeviceMutation,
} = authApi;
