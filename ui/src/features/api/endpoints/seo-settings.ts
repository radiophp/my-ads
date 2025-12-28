import { apiSlice } from '../baseApi';

import type { SeoSetting } from '@/types/seo-settings';

const seoSettingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminSeoSettings: builder.query<SeoSetting[], void>({
      query: () => '/admin/seo-settings',
      providesTags: ['AdminSeoSettings'],
    }),
    updateAdminSeoSetting: builder.mutation<
      SeoSetting,
      { pageKey: SeoSetting['pageKey']; body: Pick<SeoSetting, 'title' | 'description' | 'keywords'> }
    >({
      query: ({ pageKey, body }) => ({
        url: `/admin/seo-settings/${pageKey}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['AdminSeoSettings'],
    }),
    getSeoSetting: builder.query<SeoSetting, SeoSetting['pageKey']>({
      query: (pageKey) => `/seo-settings/${pageKey}`,
    }),
  }),
});

export const {
  useGetAdminSeoSettingsQuery,
  useUpdateAdminSeoSettingMutation,
  useGetSeoSettingQuery,
} = seoSettingsApi;
