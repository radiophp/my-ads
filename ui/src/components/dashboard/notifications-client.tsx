'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { NotificationsPanel } from '@/components/dashboard/notifications-panel';

export function NotificationsClient() {
  return (
    <AuthGuard>
      <NotificationsPanel />
    </AuthGuard>
  );
}
