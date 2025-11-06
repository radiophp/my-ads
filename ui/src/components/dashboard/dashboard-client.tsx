'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardPlaceholder } from '@/components/dashboard/dashboard-placeholder';

export function DashboardClient() {
  return (
    <AuthGuard>
      <DashboardPlaceholder />
    </AuthGuard>
  );
}
