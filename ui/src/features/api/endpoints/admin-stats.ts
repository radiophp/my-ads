import { apiSlice } from '../baseApi';

import type { AdminDashboardStats } from '@/types/admin';

const adminStatsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboardStats: builder.query<AdminDashboardStats, void>({
      query: () => '/admin-panel/stats',
      providesTags: ['AdminStats'],
    }),
  }),
});

export const { useGetAdminDashboardStatsQuery } = adminStatsApi;
