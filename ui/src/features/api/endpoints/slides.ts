import { apiSlice } from '../baseApi';

import type { Slide, SlideListResponse } from '@/types/slide';

type CreateSlidePayload = {
  title?: string | null;
  description?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  imageDesktopUrl: string;
  imageTabletUrl?: string | null;
  imageMobileUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

type UpdateSlidePayload = Partial<CreateSlidePayload>;

const slidesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminSlides: builder.query<
      SlideListResponse,
      { page?: number; pageSize?: number; search?: string } | void
    >({
      query: (params) => ({
        url: '/admin/slides',
        params: params ?? undefined,
      }),
      providesTags: ['AdminSlides'],
    }),
    getAdminSlideItem: builder.query<Slide, string>({
      query: (id) => `/admin/slides/${id}`,
      providesTags: ['AdminSlides'],
    }),
    createAdminSlide: builder.mutation<Slide, CreateSlidePayload>({
      query: (body) => ({
        url: '/admin/slides',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AdminSlides'],
    }),
    updateAdminSlide: builder.mutation<Slide, { id: string; body: UpdateSlidePayload }>({
      query: ({ id, body }) => ({
        url: `/admin/slides/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AdminSlides'],
    }),
    deleteAdminSlide: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/slides/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AdminSlides'],
    }),
  }),
});

export const {
  useGetAdminSlidesQuery,
  useGetAdminSlideItemQuery,
  useCreateAdminSlideMutation,
  useUpdateAdminSlideMutation,
  useDeleteAdminSlideMutation,
} = slidesApi;
