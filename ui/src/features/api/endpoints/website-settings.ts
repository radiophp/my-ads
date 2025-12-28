import { apiSlice } from '../baseApi';

import type { WebsiteSettings } from '@/types/website-settings';

const websiteSettingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminWebsiteSettings: builder.query<WebsiteSettings, void>({
      query: () => '/admin/website-settings',
      providesTags: ['AdminWebsiteSettings'],
    }),
    updateAdminWebsiteSettings: builder.mutation<WebsiteSettings, Partial<WebsiteSettings>>({
      query: (body) => ({
        url: '/admin/website-settings',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['AdminWebsiteSettings'],
    }),
    getWebsiteSettings: builder.query<WebsiteSettings, void>({
      query: () => '/website-settings',
    }),
  }),
});

export const {
  useGetAdminWebsiteSettingsQuery,
  useUpdateAdminWebsiteSettingsMutation,
  useGetWebsiteSettingsQuery,
} = websiteSettingsApi;
