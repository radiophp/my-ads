import { apiSlice } from '../baseApi';

import type {
  CreateFeaturedPostPayload,
  FeaturedPostAdminItem,
  FeaturedPostLookupResponse,
  FeaturedPostsAdminListResponse,
  FeaturedPostsResponse,
  UpdateFeaturedPostPayload,
} from '@/types/featured-posts';

const featuredPostsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFeaturedPosts: builder.query<FeaturedPostsResponse, void>({
      query: () => '/featured-posts',
    }),
    getAdminFeaturedPosts: builder.query<
      FeaturedPostsAdminListResponse,
      { page?: number; pageSize?: number; search?: string } | void
    >({
      query: (params) => ({
        url: '/admin/featured-posts',
        params: params ?? undefined,
      }),
      providesTags: ['AdminFeaturedPosts'],
    }),
    getAdminFeaturedPost: builder.query<FeaturedPostAdminItem, string>({
      query: (id) => `/admin/featured-posts/${id}`,
      providesTags: ['AdminFeaturedPosts'],
    }),
    lookupAdminFeaturedPost: builder.query<
      FeaturedPostLookupResponse,
      { code?: number; externalId?: string }
    >({
      query: ({ code, externalId }) => ({
        url: '/admin/featured-posts/lookup',
        params: {
          ...(code ? { code } : {}),
          ...(externalId ? { externalId } : {}),
        },
      }),
    }),
    createAdminFeaturedPost: builder.mutation<FeaturedPostAdminItem, CreateFeaturedPostPayload>({
      query: (body) => ({
        url: '/admin/featured-posts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminFeaturedPosts'],
    }),
    updateAdminFeaturedPost: builder.mutation<
      FeaturedPostAdminItem,
      { id: string; body: UpdateFeaturedPostPayload }
    >({
      query: ({ id, body }) => ({
        url: `/admin/featured-posts/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminFeaturedPosts'],
    }),
    deleteAdminFeaturedPost: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/featured-posts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminFeaturedPosts'],
    }),
  }),
});

export const {
  useGetFeaturedPostsQuery,
  useGetAdminFeaturedPostsQuery,
  useGetAdminFeaturedPostQuery,
  useLazyLookupAdminFeaturedPostQuery,
  useCreateAdminFeaturedPostMutation,
  useUpdateAdminFeaturedPostMutation,
  useDeleteAdminFeaturedPostMutation,
} = featuredPostsApi;
