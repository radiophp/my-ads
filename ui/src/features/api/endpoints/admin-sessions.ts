import { apiSlice } from '../baseApi';

import type { AdminArkaSession } from '@/types/admin-arka-session';
import type { AdminDivarSession } from '@/types/admin-divar-session';

const adminSessionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminArkaSessions: builder.query<AdminArkaSession[], void>({
      query: () => '/admin/arka-sessions',
      providesTags: (result) =>
        result
          ? [
              ...result.map((session) => ({
                type: 'AdminArkaSessions' as const,
                id: session.id,
              })),
              { type: 'AdminArkaSessions' as const, id: 'LIST' },
            ]
          : [{ type: 'AdminArkaSessions' as const, id: 'LIST' }],
    }),
    createAdminArkaSession: builder.mutation<
      AdminArkaSession,
      { label?: string; headersRaw: string; active?: boolean; locked?: boolean }
    >({
      query: (body) => ({
        url: '/admin/arka-sessions',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'AdminArkaSessions', id: 'LIST' }, 'AdminStats'],
    }),
    updateAdminArkaSession: builder.mutation<
      AdminArkaSession,
      { id: string; body: Partial<Pick<AdminArkaSession, 'label' | 'headersRaw' | 'active' | 'locked'>> }
    >({
      query: ({ id, body }) => ({
        url: `/admin/arka-sessions/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'AdminArkaSessions', id: 'LIST' },
        { type: 'AdminArkaSessions', id: arg.id },
        'AdminStats',
      ],
    }),
    getAdminDivarSessions: builder.query<AdminDivarSession[], void>({
      query: () => '/admin/divar-sessions',
      providesTags: (result) =>
        result
          ? [
              ...result.map((session) => ({
                type: 'AdminDivarSessions' as const,
                id: session.id,
              })),
              { type: 'AdminDivarSessions' as const, id: 'LIST' },
            ]
          : [{ type: 'AdminDivarSessions' as const, id: 'LIST' }],
    }),
    createAdminDivarSession: builder.mutation<
      AdminDivarSession,
      { phone: string; jwt: string; active?: boolean; locked?: boolean }
    >({
      query: (body) => ({
        url: '/admin/divar-sessions',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'AdminDivarSessions', id: 'LIST' }, 'AdminStats'],
    }),
    updateAdminDivarSession: builder.mutation<
      AdminDivarSession,
      { id: string; body: Partial<Pick<AdminDivarSession, 'phone' | 'jwt' | 'active' | 'locked'>> }
    >({
      query: ({ id, body }) => ({
        url: `/admin/divar-sessions/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'AdminDivarSessions', id: 'LIST' },
        { type: 'AdminDivarSessions', id: arg.id },
        'AdminStats',
      ],
    }),
  }),
});

export const {
  useGetAdminArkaSessionsQuery,
  useCreateAdminArkaSessionMutation,
  useUpdateAdminArkaSessionMutation,
  useGetAdminDivarSessionsQuery,
  useCreateAdminDivarSessionMutation,
  useUpdateAdminDivarSessionMutation,
} = adminSessionsApi;
