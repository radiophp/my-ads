import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { NotificationItem } from '@/types/notifications';

export type NotificationsState = {
  items: NotificationItem[];
  connected: boolean;
  lastCursor: string | null;
  hasMore: boolean;
  lastError: string | null;
};

const initialState: NotificationsState = {
  items: [],
  connected: false,
  lastCursor: null,
  hasMore: true,
  lastError: null,
};

const dedupeNotifications = (items: NotificationItem[]): NotificationItem[] => {
  const seen = new Set<string>();
  const deduped: NotificationItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    deduped.push(item);
  }
  return deduped;
};

export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    replaceNotifications(
      state,
      action: PayloadAction<{ items: NotificationItem[]; nextCursor: string | null; hasMore: boolean }>,
    ) {
      state.items = dedupeNotifications(action.payload.items);
      state.lastCursor = action.payload.nextCursor;
      state.hasMore = action.payload.hasMore;
    },
    appendNotifications(
      state,
      action: PayloadAction<{ items: NotificationItem[]; nextCursor: string | null; hasMore: boolean }>,
    ) {
      state.items = dedupeNotifications([...state.items, ...action.payload.items]);
      state.lastCursor = action.payload.nextCursor;
      state.hasMore = action.payload.hasMore;
    },
    addRealtimeNotification(state, action: PayloadAction<NotificationItem>) {
      state.items = dedupeNotifications([action.payload, ...state.items]);
    },
    markNotificationRead(
      state,
      action: PayloadAction<{ id: string; readAt?: string | null }>,
    ) {
      const target = state.items.find((item) => item.id === action.payload.id);
      if (target) {
        target.readAt = action.payload.readAt ?? target.readAt ?? null;
      }
    },
    setNotificationConnection(state, action: PayloadAction<boolean>) {
      state.connected = action.payload;
    },
    setNotificationError(state, action: PayloadAction<string | null>) {
      state.lastError = action.payload;
    },
    resetNotifications() {
      return { ...initialState };
    },
  },
});

export const {
  replaceNotifications,
  appendNotifications,
  addRealtimeNotification,
  markNotificationRead,
  setNotificationConnection,
  setNotificationError,
  resetNotifications,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
