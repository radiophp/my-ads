'use client';

import { Suspense } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardPlaceholder } from '@/components/dashboard/dashboard-placeholder';

export function DashboardClient() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <DashboardPlaceholder />
      </Suspense>
    </AuthGuard>
  );
}
