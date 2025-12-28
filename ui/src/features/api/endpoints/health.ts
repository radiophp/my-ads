import { apiSlice } from '../baseApi';

const healthApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getHealth: builder.query<{ status: string }, void>({
      query: () => '/health',
      providesTags: ['Health'],
    }),
  }),
});

export const { useGetHealthQuery } = healthApi;
