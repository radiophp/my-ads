import { apiSlice } from '../baseApi';

import type {
  DivarPostCategoryCount,
  DivarPostContactInfo,
  DivarPostListResponse,
  DivarPostSummary,
  PaginatedPostsToAnalyze,
} from '@/types/divar-posts';
import type { DivarDistrictPriceReportRow } from '@/types/divar-reports';

const divarPostsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPostsToAnalyze: builder.query<PaginatedPostsToAnalyze, number | void>({
      query: (page = 1) => `/admin/divar-posts/to-analyze?page=${page}`,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((item) => ({ type: 'PostsToAnalyze' as const, id: item.id })),
              { type: 'PostsToAnalyze' as const, id: `PAGE-${result.meta.page}` },
            ]
          : [{ type: 'PostsToAnalyze', id: 'LIST' }],
    }),
    getDivarPosts: builder.query<
      DivarPostListResponse,
      {
        cursor?: string | null;
        limit?: number;
        provinceId?: number;
        cityIds?: number[];
        districtIds?: number[];
        categorySlug?: string | null;
        categoryDepth?: number | null;
        filters?: Record<string, unknown>;
        ringFolderId?: string | null;
        noteFilter?: 'has' | 'none';
      } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.cursor) {
          searchParams.set('cursor', params.cursor);
        }
        if (params?.limit) {
          searchParams.set('limit', String(params.limit));
        }
        if (typeof params?.provinceId === 'number') {
          searchParams.set('provinceId', String(params.provinceId));
        }
        if (params?.cityIds && params.cityIds.length > 0) {
          searchParams.set('cityIds', params.cityIds.join(','));
        }
        if (params?.districtIds && params.districtIds.length > 0) {
          searchParams.set('districtIds', params.districtIds.join(','));
        }
        if (params?.categorySlug) {
          searchParams.set('categorySlug', params.categorySlug);
        }
        if (typeof params?.categoryDepth === 'number') {
          searchParams.set('categoryDepth', String(params.categoryDepth));
        }
        if (params?.filters && Object.keys(params.filters).length > 0) {
          searchParams.set('filters', JSON.stringify(params.filters));
        }
        if (params?.ringFolderId) {
          searchParams.set('ringFolderId', params.ringFolderId);
        }
        if (params?.noteFilter === 'has' || params?.noteFilter === 'none') {
          searchParams.set('noteFilter', params.noteFilter);
        }
        const qs = searchParams.toString();
        return `/divar-posts${qs ? `?${qs}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((item) => ({
                type: 'DivarPosts' as const,
                id: item.id,
              })),
              { type: 'DivarPosts' as const, id: result.nextCursor ?? 'END' },
            ]
          : [{ type: 'DivarPosts' as const, id: 'LIST' }],
    }),
    getDivarPost: builder.query<DivarPostSummary, string>({
      query: (id) => `/divar-posts/detail/${id}`,
      providesTags: (result, error, id) => [{ type: 'DivarPosts', id }],
    }),
    getDivarPostByCode: builder.query<DivarPostSummary, number>({
      query: (code) => `/divar-posts/code/${code}`,
      providesTags: (result, error, code) => [{ type: 'DivarPosts', id: `code-${code}` }],
    }),
    getDivarPostCategoryCounts: builder.query<DivarPostCategoryCount[], void>({
      query: () => '/divar-posts/category-counts',
    }),
    getDivarDistrictPriceReport: builder.query<
      DivarDistrictPriceReportRow[],
      { categorySlug: string; from: string; to: string; minValue: number; maxValue?: number | null }
    >({
      query: ({ categorySlug, from, to, minValue, maxValue }) => {
        const searchParams = new URLSearchParams({
          categorySlug,
          from,
          to,
          minValue: String(minValue),
        });
        if (typeof maxValue === 'number') {
          searchParams.set('maxValue', String(maxValue));
        }
        return `/admin/divar-posts/district-prices?${searchParams.toString()}`;
      },
    }),
    fetchPostPhone: builder.mutation<{ phoneNumber: string | null }, { postId: string }>({
      query: ({ postId }) => ({
        url: `/divar-posts/${postId}/share-phone`,
        method: 'POST',
        body: {},
      }),
    }),
    fetchPostContactInfo: builder.mutation<DivarPostContactInfo, { postId: string }>({
      query: ({ postId }) => ({
        url: `/divar-posts/${postId}/contact-info`,
        method: 'POST',
        body: {},
      }),
    }),
  }),
});

export const {
  useGetPostsToAnalyzeQuery,
  useGetDivarPostsQuery,
  useLazyGetDivarPostsQuery,
  useGetDivarPostQuery,
  useGetDivarPostByCodeQuery,
  useLazyGetDivarPostByCodeQuery,
  useGetDivarPostCategoryCountsQuery,
  useLazyGetDivarDistrictPriceReportQuery,
  useFetchPostPhoneMutation,
  useFetchPostContactInfoMutation,
} = divarPostsApi;
