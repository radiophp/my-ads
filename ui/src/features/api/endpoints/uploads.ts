import { apiSlice } from '../baseApi';

type UploadResponse = {
  bucket: string;
  key: string;
  eTag?: string;
  url: string;
  originalName?: string;
  contentType?: string;
};

const uploadsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    uploadProfileImage: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/uploads',
        method: 'POST',
        body: formData,
      }),
    }),
    uploadTempProfileImage: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/uploads/temp',
        method: 'POST',
        body: formData,
      }),
    }),
    deleteTempProfileImage: builder.mutation<void, { key: string }>({
      query: ({ key }) => ({
        url: '/uploads/temp',
        method: 'DELETE',
        body: { key },
      }),
    }),
    uploadPublicImage: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: '/uploads/public',
        method: 'POST',
        body: formData,
      }),
    }),
  }),
});

export const {
  useUploadProfileImageMutation,
  useUploadTempProfileImageMutation,
  useDeleteTempProfileImageMutation,
  useUploadPublicImageMutation,
} = uploadsApi;
