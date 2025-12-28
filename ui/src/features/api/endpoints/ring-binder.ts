import { apiSlice } from '../baseApi';

import type {
  PostSavedFoldersResponse,
  RingBinderFolder,
  RingBinderFolderListResponse,
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
} = ringBinderApi;
