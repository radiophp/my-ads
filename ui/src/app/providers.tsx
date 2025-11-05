'use client';

import type { JSX, PropsWithChildren } from 'react';
import { Provider as ReduxProvider } from 'react-redux';

import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import { Toaster } from '@/components/ui/toaster';
import { store } from '@/lib/store';

export function Providers({ children }: PropsWithChildren): JSX.Element {
  return (
    <ReduxProvider store={store}>
      {children}
      <Toaster />
      <PwaInstallPrompt />
    </ReduxProvider>
  );
}
