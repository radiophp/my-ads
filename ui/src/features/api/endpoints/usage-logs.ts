import { apiSlice } from '../baseApi';

type UsageLogItem = {
  id: string;
  userId: string;
  feature: string;
  action: string;
  metadata: Record<string, unknown> | null;
  consumedAt: string;
  user?: { id: string; phone: string; firstName: string | null; lastName: string | null };
};

type PaginatedUsageLogs = {
  items: UsageLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type UsageSummary = {
  features: Array<{
    feature: string;
    limit: number;
    current: number;
    remaining: number;
  }>;
};

const usageLogsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminUsageLogs: builder.query<
      PaginatedUsageLogs,
      { userId?: string; feature?: string; from?: string; to?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/admin/usage-logs',
        params,
      }),
      providesTags: ['UsageLogs'],
    }),
    getAdminUserUsageSummary: builder.query<UsageSummary, string>({
      query: (userId) => `/admin/usage-logs/user/${userId}`,
      providesTags: ['UsageLogs'],
    }),
    getMyUsageLogs: builder.query<
      PaginatedUsageLogs,
      { feature?: string; from?: string; to?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/user-panel/usage/logs',
        params,
      }),
      providesTags: ['UsageLogs'],
    }),
    getMyUsageLimits: builder.query<UsageSummary, void>({
      query: () => '/user-panel/usage/limits',
      providesTags: ['UsageLogs'],
    }),
  }),
});

export const {
  useGetAdminUsageLogsQuery,
  useGetAdminUserUsageSummaryQuery,
  useGetMyUsageLogsQuery,
  useGetMyUsageLimitsQuery,
} = usageLogsApi;
