'use client';

import type { PropsWithChildren } from 'react';
import { Provider as ReduxProvider } from 'react-redux';

import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import { Toaster } from '@/components/ui/toaster';
import { store } from '@/lib/store';
import { AuthInitializer } from '@/components/auth/auth-initializer';
import { PwaServiceWorker } from '@/components/pwa-service-worker';

export function Providers({ children }: PropsWithChildren) {
  return (
    <ReduxProvider store={store}>
      <AuthInitializer />
      <PwaServiceWorker />
      {children}
      <Toaster />
      <PwaInstallPrompt />
    </ReduxProvider>
  );
}
