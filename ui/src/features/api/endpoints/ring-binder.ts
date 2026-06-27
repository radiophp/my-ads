import { apiSlice } from '../baseApi';

import type {
  AllSharedUsersResponse,
  PostSavedFoldersResponse,
  RingBinderFolder,
  RingBinderFolderListResponse,
  RingBinderShare,
  SharedWithMeFolder,
} from '@/types/ring-binder';

const ringBinderApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRingBinderFolders: builder.query<RingBinderFolderListResponse, void>({
      query: () => '/ring-binders/folders',
      providesTags: (result) =>
        result?.folders && result.folders.length > 0
          ? [
              ...result.folders.map((folder) => ({
                type: 'RingBinderFolders' as const,
                id: folder.id,
              })),
              { type: 'RingBinderFolders' as const, id: 'LIST' },
            ]
          : [{ type: 'RingBinderFolders' as const, id: 'LIST' }],
    }),
    createRingBinderFolder: builder.mutation<RingBinderFolder, { name: string }>({
      query: (body) => ({
        url: '/ring-binders/folders',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'RingBinderFolders', id: 'LIST' }],
    }),
    updateRingBinderFolder: builder.mutation<RingBinderFolder, { id: string; name: string }>({
      query: ({ id, name }) => ({
        url: `/ring-binders/folders/${id}`,
        method: 'PATCH',
        body: { name },
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'RingBinderFolders', id: arg.id },
        { type: 'RingBinderFolders', id: 'LIST' },
      ],
    }),
    savePostToRingBinderFolder: builder.mutation<
      { success: boolean },
      { folderId: string; postId: string }
    >({
      query: ({ folderId, postId }) => ({
        url: `/ring-binders/folders/${folderId}/posts`,
        method: 'POST',
        body: { postId },
      }),
    }),
    removePostFromRingBinderFolder: builder.mutation<
      { success: boolean },
      { folderId: string; postId: string }
    >({
      query: ({ folderId, postId }) => ({
        url: `/ring-binders/folders/${folderId}/posts/${postId}`,
        method: 'DELETE',
      }),
    }),
    getPostSavedFolders: builder.query<PostSavedFoldersResponse, string>({
      query: (postId) => `/ring-binders/posts/${postId}`,
      providesTags: (result, error, postId) => [{ type: 'RingBinderFolders', id: `post-${postId}` }],
    }),
    upsertPostNote: builder.mutation<
      { content: string | null; updatedAt?: string },
      { postId: string; content: string }
    >({
      query: ({ postId, content }) => ({
        url: `/ring-binders/posts/${postId}/note`,
        method: 'PUT',
        body: { content },
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'RingBinderFolders', id: `post-${arg.postId}` },
      ],
    }),
    deletePostNote: builder.mutation<{ success: boolean }, { postId: string }>({
      query: ({ postId }) => ({
        url: `/ring-binders/posts/${postId}/note`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'RingBinderFolders', id: `post-${arg.postId}` },
      ],
    }),
    deleteRingBinderFolder: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/ring-binders/folders/${id}`,
        method: 'DELETE',
        body: {},
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'RingBinderFolders', id },
        { type: 'RingBinderFolders', id: 'LIST' },
      ],
    }),

    // --- Share endpoints ---

    shareFolder: builder.mutation<RingBinderShare, { folderId: string; phone: string }>({
      query: ({ folderId, phone }) => ({
        url: `/ring-binders/folders/${folderId}/share`,
        method: 'POST',
        body: { phone },
      }),
      invalidatesTags: [
        { type: 'RingBinderFolders', id: 'SHARES' },
        { type: 'RingBinderFolders', id: 'SHARED_WITH_ME' },
      ],
    }),
    removeFolderShare: builder.mutation<
      { success: boolean },
      { folderId: string; userId: string }
    >({
      query: ({ folderId, userId }) => ({
        url: `/ring-binders/folders/${folderId}/share/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'RingBinderFolders', id: 'SHARES' },
        { type: 'RingBinderFolders', id: 'SHARED_WITH_ME' },
      ],
    }),
    removeUserFromShares: builder.mutation<
      { deletedCount: number },
      { userId: string }
    >({
      query: ({ userId }) => ({
        url: `/ring-binders/shares/user/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'RingBinderFolders', id: 'SHARES' },
        { type: 'RingBinderFolders', id: 'SHARED_WITH_ME' },
      ],
    }),
    getFolderShares: builder.query<RingBinderShare[], { folderId: string }>({
      query: ({ folderId }) => `/ring-binders/folders/${folderId}/shares`,
      providesTags: [{ type: 'RingBinderFolders', id: 'SHARES' }],
    }),
    getAllSharedUsers: builder.query<AllSharedUsersResponse, void>({
      query: () => '/ring-binders/shares/users',
      providesTags: [{ type: 'RingBinderFolders', id: 'SHARES' }],
    }),
    getSharedWithMe: builder.query<SharedWithMeFolder[], void>({
      query: () => '/ring-binders/shared-with-me',
      providesTags: [{ type: 'RingBinderFolders', id: 'SHARED_WITH_ME' }],
    }),
  }),
});

export const {
  useGetRingBinderFoldersQuery,
  useCreateRingBinderFolderMutation,
  useUpdateRingBinderFolderMutation,
  useSavePostToRingBinderFolderMutation,
  useRemovePostFromRingBinderFolderMutation,
  useGetPostSavedFoldersQuery,
  useUpsertPostNoteMutation,
  useDeletePostNoteMutation,
  useDeleteRingBinderFolderMutation,
  useShareFolderMutation,
  useRemoveFolderShareMutation,
  useRemoveUserFromSharesMutation,
  useGetFolderSharesQuery,
  useGetAllSharedUsersQuery,
  useGetSharedWithMeQuery,
} = ringBinderApi;
