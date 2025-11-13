'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { RingBinderPanel } from '@/components/ring-binder/ring-binder-panel';

export function RingBinderClient() {
  return (
    <AuthGuard>
      <RingBinderPanel />
    </AuthGuard>
  );
}
