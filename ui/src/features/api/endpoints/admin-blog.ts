import { apiSlice } from '../baseApi';

import type {
  BlogCategory,
  BlogItem,
  BlogListResponse,
  BlogSource,
  BlogTag,
  CreateBlogCategoryPayload,
  CreateBlogPayload,
  CreateBlogTagPayload,
  UpdateBlogCategoryPayload,
  UpdateBlogPayload,
  UpdateBlogTagPayload,
  UpdateBlogSourcePayload,
} from '@/types/blog';

const adminBlogApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminBlog: builder.query<
      BlogListResponse,
      { page?: number; pageSize?: number; search?: string } | void
    >({
      query: (params) => ({
        url: '/admin/blog',
        params: params ?? undefined,
      }),
      providesTags: ['AdminBlog'],
    }),
    getAdminBlogItem: builder.query<BlogItem, string>({
      query: (id) => `/admin/blog/${id}`,
      providesTags: ['AdminBlog'],
    }),
    createAdminBlog: builder.mutation<BlogItem, CreateBlogPayload>({
      query: (body) => ({
        url: '/admin/blog',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminBlog'],
    }),
    updateAdminBlog: builder.mutation<BlogItem, { id: string; body: UpdateBlogPayload }>({
      query: ({ id, body }) => ({
        url: `/admin/blog/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminBlog'],
    }),
    deleteAdminBlog: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/blog/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminBlog'],
    }),
    getAdminBlogCategories: builder.query<BlogCategory[], void>({
      query: () => '/admin/blog-categories',
      providesTags: ['AdminBlogCategories'],
    }),
    createAdminBlogCategory: builder.mutation<BlogCategory, CreateBlogCategoryPayload>({
      query: (body) => ({
        url: '/admin/blog-categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminBlogCategories', 'AdminBlog'],
    }),
    updateAdminBlogCategory: builder.mutation<
      BlogCategory,
      { id: string; body: UpdateBlogCategoryPayload }
    >({
      query: ({ id, body }) => ({
        url: `/admin/blog-categories/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminBlogCategories', 'AdminBlog'],
    }),
    deleteAdminBlogCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/blog-categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminBlogCategories', 'AdminBlog'],
    }),
    getAdminBlogTags: builder.query<BlogTag[], void>({
      query: () => '/admin/blog-tags',
      providesTags: ['AdminBlogTags'],
    }),
    getAdminBlogSources: builder.query<BlogSource[], void>({
      query: () => '/admin/blog-sources',
      providesTags: ['AdminBlogSources'],
    }),
    createAdminBlogTag: builder.mutation<BlogTag, CreateBlogTagPayload>({
      query: (body) => ({
        url: '/admin/blog-tags',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminBlogTags', 'AdminBlog'],
    }),
    updateAdminBlogTag: builder.mutation<BlogTag, { id: string; body: UpdateBlogTagPayload }>({
      query: ({ id, body }) => ({
        url: `/admin/blog-tags/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminBlogTags', 'AdminBlog'],
    }),
    deleteAdminBlogTag: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/blog-tags/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminBlogTags', 'AdminBlog'],
    }),
    updateAdminBlogSource: builder.mutation<
      BlogSource,
      { id: string; body: UpdateBlogSourcePayload }
    >({
      query: ({ id, body }) => ({
        url: `/admin/blog-sources/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminBlogSources'],
    }),
  }),
});

export const {
  useGetAdminBlogQuery,
  useGetAdminBlogItemQuery,
  useCreateAdminBlogMutation,
  useUpdateAdminBlogMutation,
  useDeleteAdminBlogMutation,
  useGetAdminBlogCategoriesQuery,
  useCreateAdminBlogCategoryMutation,
  useUpdateAdminBlogCategoryMutation,
  useDeleteAdminBlogCategoryMutation,
  useGetAdminBlogTagsQuery,
  useGetAdminBlogSourcesQuery,
  useCreateAdminBlogTagMutation,
  useUpdateAdminBlogTagMutation,
  useDeleteAdminBlogTagMutation,
  useUpdateAdminBlogSourceMutation,
} = adminBlogApi;
