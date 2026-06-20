import { apiSlice } from '../baseApi';

const baleApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    sharePostOnBale: builder.mutation<{ success: boolean; error?: string }, { postId: string }>({
      query: ({ postId }) => ({
        url: '/bale/share-post',
        method: 'POST',
        body: { postId },
      }),
    }),
  }),
});

export const {
  useSharePostOnBaleMutation,
} = baleApi;
