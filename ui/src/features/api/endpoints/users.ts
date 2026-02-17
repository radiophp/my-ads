import { apiSlice } from '../baseApi';

import type { CurrentUser } from '@/types/auth';

const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<CurrentUser[], void>({
      query: () => '/users',
      providesTags: ['AdminUsers'],
    }),
  }),
});

export const { useGetUsersQuery } = usersApi;
