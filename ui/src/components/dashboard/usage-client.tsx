'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { UsageManager } from '@/components/dashboard/usage-manager';

export function UsageClient() {
  return (
    <AuthGuard>
      <UsageManager />
    </AuthGuard>
  );
}
