import { apiSlice } from '../baseApi';

import type { NotificationsResponse } from '@/types/notifications';

const notificationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    registerPushSubscription: builder.mutation<
      { ok: true },
      { endpoint: string; p256dh: string; auth: string }
    >({
      query: (body) => ({
        url: '/notifications/push/subscribe',
        method: 'POST',
        body,
      }),
    }),
    unregisterPushSubscription: builder.mutation<{ ok: true }, { endpoint: string }>({
      query: (body) => ({
        url: '/notifications/push/unsubscribe',
        method: 'POST',
        body,
      }),
    }),
    sendTestNotification: builder.mutation<
      { notificationId: string; status: string; telegramSent?: boolean; telegramQueued?: boolean },
      {
        userId: string;
        savedFilterId: string;
        postId?: string;
        postCode?: number;
        message?: string;
        sendTelegram?: boolean;
      }
    >({
      query: (body) => ({
        url: '/notifications/admin/test',
        method: 'POST',
        body,
      }),
    }),
    getNotifications: builder.query<NotificationsResponse, { cursor?: string; limit?: number } | void>({
      query: (params) => {
        const query: Record<string, string> = {};
        if (params?.cursor) {
          query.cursor = params.cursor;
        }
        if (params?.limit) {
          query.limit = String(params.limit);
        }
        return {
          url: '/notifications',
          params: query,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((item) => ({
                type: 'Notifications' as const,
                id: item.id,
              })),
              { type: 'Notifications' as const, id: 'LIST' },
            ]
          : [{ type: 'Notifications' as const, id: 'LIST' }],
    }),
    markNotificationRead: builder.mutation<{ ok: true }, { notificationId: string }>({
      query: (body) => ({
        url: '/notifications/read',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useRegisterPushSubscriptionMutation,
  useUnregisterPushSubscriptionMutation,
  useSendTestNotificationMutation,
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useMarkNotificationReadMutation,
} = notificationsApi;
