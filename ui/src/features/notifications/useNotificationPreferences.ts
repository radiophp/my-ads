'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type NotificationPreferences = {
  realtimeEnabled: boolean;
  pushEnabled: boolean;
};

const STORAGE_KEY = 'notification-preferences';
const EVENT_NAME = 'notifications:preferences';

const defaultPreferences: NotificationPreferences = {
  realtimeEnabled: true,
  pushEnabled: true,
};

const readPreferences = (): NotificationPreferences => {
  if (typeof window === 'undefined') {
    return defaultPreferences;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultPreferences;
    }
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      realtimeEnabled:
        typeof parsed.realtimeEnabled === 'boolean' ? parsed.realtimeEnabled : true,
      pushEnabled: typeof parsed.pushEnabled === 'boolean' ? parsed.pushEnabled : true,
    };
  } catch {
    return defaultPreferences;
  }
};

const writePreferences = (value: NotificationPreferences) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // ignore storage failures
  }
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const preferencesRef = useRef<NotificationPreferences>(defaultPreferences);

  useEffect(() => {
    const initial = readPreferences();
    preferencesRef.current = initial;
    setPreferences(initial);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }
      const next = readPreferences();
      preferencesRef.current = next;
      setPreferences(next);
    };
    const handleLocalUpdate = () => {
      const next = readPreferences();
      preferencesRef.current = next;
      setPreferences(next);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(EVENT_NAME, handleLocalUpdate as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(EVENT_NAME, handleLocalUpdate as EventListener);
    };
  }, []);

  const update = useCallback((partial: Partial<NotificationPreferences>) => {
    const next = { ...preferencesRef.current, ...partial };
    preferencesRef.current = next;
    setPreferences(next);
    writePreferences(next);
  }, []);

  const setters = useMemo(
    () => ({
      setRealtimeEnabled: (value: boolean) => update({ realtimeEnabled: value }),
      setPushEnabled: (value: boolean) => update({ pushEnabled: value }),
    }),
    [update],
  );

  return {
    ...preferences,
    ...setters,
  };
}
