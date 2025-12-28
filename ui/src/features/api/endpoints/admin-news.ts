import { apiSlice } from '../baseApi';

import type {
  CreateNewsCategoryPayload,
  CreateNewsPayload,
  CreateNewsTagPayload,
  NewsCategory,
  NewsItem,
  NewsListResponse,
  NewsTag,
  NewsSource,
  UpdateNewsCategoryPayload,
  UpdateNewsPayload,
  UpdateNewsTagPayload,
  UpdateNewsSourcePayload,
} from '@/types/news';

const adminNewsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminNews: builder.query<
      NewsListResponse,
      { page?: number; pageSize?: number; search?: string } | void
    >({
      query: (params) => ({
        url: '/admin/news',
        params: params ?? undefined,
      }),
      providesTags: ['AdminNews'],
    }),
    getAdminNewsItem: builder.query<NewsItem, string>({
      query: (id) => `/admin/news/${id}`,
      providesTags: ['AdminNews'],
    }),
    createAdminNews: builder.mutation<NewsItem, CreateNewsPayload>({
      query: (body) => ({
        url: '/admin/news',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminNews'],
    }),
    updateAdminNews: builder.mutation<NewsItem, { id: string; body: UpdateNewsPayload }>({
      query: ({ id, body }) => ({
        url: `/admin/news/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminNews'],
    }),
    deleteAdminNews: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/news/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminNews'],
    }),
    getAdminNewsCategories: builder.query<NewsCategory[], void>({
      query: () => '/admin/news-categories',
      providesTags: ['AdminNewsCategories'],
    }),
    createAdminNewsCategory: builder.mutation<NewsCategory, CreateNewsCategoryPayload>({
      query: (body) => ({
        url: '/admin/news-categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminNewsCategories', 'AdminNews'],
    }),
    updateAdminNewsCategory: builder.mutation<
      NewsCategory,
      { id: string; body: UpdateNewsCategoryPayload }
    >({
      query: ({ id, body }) => ({
        url: `/admin/news-categories/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminNewsCategories', 'AdminNews'],
    }),
    deleteAdminNewsCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/news-categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminNewsCategories', 'AdminNews'],
    }),
    getAdminNewsTags: builder.query<NewsTag[], void>({
      query: () => '/admin/news-tags',
      providesTags: ['AdminNewsTags'],
    }),
    getAdminNewsSources: builder.query<NewsSource[], void>({
      query: () => '/admin/news-sources',
      providesTags: ['AdminNewsSources'],
    }),
    createAdminNewsTag: builder.mutation<NewsTag, CreateNewsTagPayload>({
      query: (body) => ({
        url: '/admin/news-tags',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminNewsTags', 'AdminNews'],
    }),
    updateAdminNewsTag: builder.mutation<NewsTag, { id: string; body: UpdateNewsTagPayload }>({
      query: ({ id, body }) => ({
        url: `/admin/news-tags/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminNewsTags', 'AdminNews'],
    }),
    deleteAdminNewsTag: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/news-tags/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminNewsTags', 'AdminNews'],
    }),
    updateAdminNewsSource: builder.mutation<
      NewsSource,
      { id: string; body: UpdateNewsSourcePayload }
    >({
      query: ({ id, body }) => ({
        url: `/admin/news-sources/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminNewsSources'],
    }),
  }),
});

export const {
  useGetAdminNewsQuery,
  useGetAdminNewsItemQuery,
  useCreateAdminNewsMutation,
  useUpdateAdminNewsMutation,
  useDeleteAdminNewsMutation,
  useGetAdminNewsCategoriesQuery,
  useCreateAdminNewsCategoryMutation,
  useUpdateAdminNewsCategoryMutation,
  useDeleteAdminNewsCategoryMutation,
  useGetAdminNewsTagsQuery,
  useGetAdminNewsSourcesQuery,
  useCreateAdminNewsTagMutation,
  useUpdateAdminNewsTagMutation,
  useDeleteAdminNewsTagMutation,
  useUpdateAdminNewsSourceMutation,
} = adminNewsApi;
