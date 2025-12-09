'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

import type { NotificationItem } from '@/types/notifications';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  addRealtimeNotification,
  setNotificationConnection,
  setNotificationError,
  resetNotifications,
} from './notificationsSlice';
import { showNativeNotificationIfPermitted } from './nativeNotifications';

const SOCKET_PATH = '/socket.io';
const WS_NAMESPACE = '/ws';

const resolveWsOrigin = (): string => {
  const envBase = process.env.NEXT_PUBLIC_WS_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) {
    try {
      const parsed = new URL(envBase);
      return parsed.origin + WS_NAMESPACE;
    } catch {
      // fall through to window origin
    }
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${WS_NAMESPACE}`;
  }
  return WS_NAMESPACE;
};

export function useNotificationsSocket(): void {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.accessToken);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      dispatch(setNotificationConnection(false));
      dispatch(resetNotifications());
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const url = resolveWsOrigin();
    const socket = io(url, {
      path: SOCKET_PATH,
      transports: ['websocket'],
      auth: { token },
      withCredentials: true,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      dispatch(setNotificationConnection(true));
      dispatch(setNotificationError(null));
    });
    socket.on('disconnect', () => {
      dispatch(setNotificationConnection(false));
    });
    socket.on('notifications:error', (payload: { message?: string }) => {
      dispatch(setNotificationError(payload?.message ?? 'connection-error'));
    });
    socket.on('connect_error', (error: Error) => {
      dispatch(setNotificationError(error.message));
    });
    socket.on('notifications:new', (payload: NotificationItem) => {
      dispatch(addRealtimeNotification(payload));
      void showNativeNotificationIfPermitted(payload);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('notifications:new');
      socket.off('notifications:error');
      socket.off('connect_error');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [dispatch, token]);
}
