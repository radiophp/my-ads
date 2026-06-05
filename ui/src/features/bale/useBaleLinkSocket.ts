'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

const SOCKET_PATH = '/socket.io';
const WS_NAMESPACE = '/ws/bale-link';

const resolveWsOrigin = (): string => {
  const envBase = process.env.NEXT_PUBLIC_WS_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) {
    try {
      const parsed = new URL(envBase);
      return parsed.origin + WS_NAMESPACE;
    } catch {
      // fall through
    }
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${WS_NAMESPACE}`;
  }
  return WS_NAMESPACE;
};

export type BaleLinkSocketOptions = {
  token: string | null;
  onLinked?: () => void;
  onError?: (message: string) => void;
};

export function useBaleLinkSocket(options: BaleLinkSocketOptions): void {
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!options.token) {
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
      auth: { token: options.token },
      withCredentials: true,
      reconnectionAttempts: 3,
      timeout: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // connected — waiting for bale:linked event
    });

    socket.on('bale:linked', () => {
      optionsRef.current.onLinked?.();
    });

    socket.on('bale:error', (payload: { message?: string }) => {
      optionsRef.current.onError?.(payload?.message ?? 'bale-link-error');
    });

    socket.on('connect_error', (error: Error) => {
      optionsRef.current.onError?.(error.message);
    });

    return () => {
      socket.off('connect');
      socket.off('bale:linked');
      socket.off('bale:error');
      socket.off('connect_error');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [options.token]);
}
