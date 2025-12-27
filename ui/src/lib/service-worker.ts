const PRIMARY_SW_PATH = '/service-worker.js';
const FALLBACK_SW_PATH = '/push-sw.js';

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) {
    return existing;
  }

  try {
    return await navigator.serviceWorker.register(PRIMARY_SW_PATH);
  } catch (error) {
    try {
      return await navigator.serviceWorker.register(FALLBACK_SW_PATH);
    } catch (fallbackError) {
      console.warn('Service worker registration failed', { error, fallbackError });
      throw fallbackError;
    }
  }
};
