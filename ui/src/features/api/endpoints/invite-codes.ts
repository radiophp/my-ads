import { apiSlice } from '../baseApi';

import type {
  CreateInviteCodePayload,
  InviteCode,
  UpdateInviteCodePayload,
} from '@/types/invite-codes';

const inviteCodesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInviteCodes: builder.query<InviteCode[], void>({
      query: () => '/admin/invite-codes',
      providesTags: (result) =>
        result
          ? [
              ...result.map((code) => ({ type: 'InviteCodes' as const, id: code.id })),
              { type: 'InviteCodes' as const, id: 'LIST' },
            ]
          : [{ type: 'InviteCodes' as const, id: 'LIST' }],
    }),
    getInviteCode: builder.query<InviteCode, string>({
      query: (id) => `/admin/invite-codes/${id}`,
      providesTags: (result, error, id) => [{ type: 'InviteCodes', id }],
    }),
    createInviteCode: builder.mutation<InviteCode, CreateInviteCodePayload>({
      query: (body) => ({
        url: '/admin/invite-codes',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'InviteCodes', id: 'LIST' }],
    }),
    updateInviteCode: builder.mutation<InviteCode, { id: string; body: UpdateInviteCodePayload }>({
      query: ({ id, body }) => ({
        url: `/admin/invite-codes/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'InviteCodes', id: 'LIST' },
        { type: 'InviteCodes', id: arg.id },
      ],
    }),
    deleteInviteCode: builder.mutation<void, string>({
      query: (id) => ({
        url: `/admin/invite-codes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'InviteCodes', id: 'LIST' },
        { type: 'InviteCodes', id },
      ],
    }),
  }),
});

export const {
  useGetInviteCodesQuery,
  useGetInviteCodeQuery,
  useCreateInviteCodeMutation,
  useUpdateInviteCodeMutation,
  useDeleteInviteCodeMutation,
} = inviteCodesApi;
