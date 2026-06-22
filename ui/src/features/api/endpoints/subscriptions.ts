import { apiSlice } from '../baseApi';

import type { ActivateSubscriptionPayload, UserSubscription } from '@/types/subscriptions';
import type { SubscriptionPackage } from '@/types/packages';

type ActivationStatus = {
  activationStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  activationNote: string | null;
  activationRequestedAt: string | null;
};

const subscriptionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentSubscription: builder.query<UserSubscription | null, void>({
      query: () => '/user-panel/subscriptions/current',
      providesTags: ['UserSubscription'],
    }),
    getAvailablePackages: builder.query<SubscriptionPackage[], void>({
      query: () => '/user-panel/subscriptions/packages',
      providesTags: ['Packages'],
    }),
    activateSubscription: builder.mutation<UserSubscription, ActivateSubscriptionPayload>({
      query: (body) => ({
        url: '/user-panel/subscriptions/activate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserSubscription', 'SavedFilters'],
    }),
    requestActivation: builder.mutation<{ status: string; message: string }, { packageId: string }>({
      query: (body) => ({
        url: '/user-panel/subscriptions/request-activation',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserSubscription', 'AdminUsers'],
    }),
    getActivationStatus: builder.query<ActivationStatus | null, void>({
      query: () => '/user-panel/subscriptions/activation-status',
      providesTags: ['AdminUsers'],
    }),
  }),
});

export const {
  useGetCurrentSubscriptionQuery,
  useGetAvailablePackagesQuery,
  useActivateSubscriptionMutation,
  useRequestActivationMutation,
  useGetActivationStatusQuery,
} = subscriptionsApi;
