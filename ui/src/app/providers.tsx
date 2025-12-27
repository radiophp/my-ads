'use client';

import type { PropsWithChildren } from 'react';
import { Provider as ReduxProvider } from 'react-redux';

import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import { Toaster } from '@/components/ui/toaster';
import { store } from '@/lib/store';
import { AuthInitializer } from '@/components/auth/auth-initializer';
import { PwaServiceWorker } from '@/components/pwa-service-worker';
import { PushNotificationListener } from '@/components/notifications/push-notification-listener';
import { PushSubscriptionSync } from '@/components/notifications/push-subscription-sync';
import { PwaBackNavigation } from '@/components/pwa-back-navigation';

export function Providers({ children }: PropsWithChildren) {
  return (
    <ReduxProvider store={store}>
      <AuthInitializer />
      <PwaBackNavigation />
      <PwaServiceWorker />
      <PushSubscriptionSync />
      <PushNotificationListener />
      {children}
      <Toaster />
      <PwaInstallPrompt />
    </ReduxProvider>
  );
}
