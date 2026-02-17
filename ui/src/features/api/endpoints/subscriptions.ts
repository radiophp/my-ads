import { apiSlice } from '../baseApi';

import type { ActivateSubscriptionPayload, UserSubscription } from '@/types/subscriptions';
import type { SubscriptionPackage } from '@/types/packages';

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
  }),
});

export const {
  useGetCurrentSubscriptionQuery,
  useGetAvailablePackagesQuery,
  useActivateSubscriptionMutation,
} = subscriptionsApi;
