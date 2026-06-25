import { apiSlice } from '../baseApi';

import type { CurrentUser } from '@/types/auth';

export type AdminUserListItem = {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  activationStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  activationNote: string | null;
  activationRequestedAt: string | null;
  createdAt: string;
  city: { id: number; name: string; province: string } | null;
  currentSubscription: { id: string; packageTitle: string; endsAt: string } | null;
};

export type UserFeatureOverride = {
  id: string;
  userId: string;
  featureKey: string;
  limitValue: number;
};

export type PaginatedUsersResponse = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<CurrentUser[], void>({
      query: () => '/users',
      providesTags: ['AdminUsers'],
    }),
    getAdminUsers: builder.query<
      PaginatedUsersResponse,
      { page?: number; limit?: number; search?: string; activationStatus?: string }
    >({
      query: (params) => ({
        url: '/admin/users',
        params,
      }),
      providesTags: ['AdminUsers'],
    }),
    getPendingActivations: builder.query<PaginatedUsersResponse, void>({
      query: () => '/admin/users/pending-activation',
      providesTags: ['AdminUsers'],
    }),
    approveActivation: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/users/${id}/approve-activation`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['AdminUsers', 'UserSubscription'],
    }),
    rejectActivation: builder.mutation<void, { id: string; note?: string }>({
      query: ({ id, note }) => ({
        url: `/admin/users/${id}/reject-activation`,
        method: 'POST',
        body: { note },
      }),
      invalidatesTags: ['AdminUsers'],
    }),
    getUserFeatureOverrides: builder.query<UserFeatureOverride[], string>({
      query: (userId) => `/users/${userId}/feature-overrides`,
    }),
    upsertUserFeatureOverride: builder.mutation<void, { userId: string; featureKey: string; limitValue: number }>({
      query: ({ userId, featureKey, limitValue }) => ({
        url: `/users/${userId}/feature-overrides/${featureKey}`,
        method: 'PUT',
        body: { limitValue },
      }),
      invalidatesTags: ['AdminUsers'],
    }),
    devDeleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}/dev-delete`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminUsers'],
    }),
    deleteUserFeatureOverride: builder.mutation<void, { userId: string; featureKey: string }>({
      query: ({ userId, featureKey }) => ({
        url: `/users/${userId}/feature-overrides/${featureKey}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminUsers'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetAdminUsersQuery,
  useGetPendingActivationsQuery,
  useApproveActivationMutation,
  useRejectActivationMutation,
  useGetUserFeatureOverridesQuery,
  useUpsertUserFeatureOverrideMutation,
  useDeleteUserFeatureOverrideMutation,
  useDevDeleteUserMutation,
} = usersApi;
