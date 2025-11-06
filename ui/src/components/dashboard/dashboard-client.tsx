'use client';

import type { JSX } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { DashboardPlaceholder } from '@/components/dashboard/dashboard-placeholder';

export function DashboardClient(): JSX.Element {
  return (
    <AuthGuard>
      <DashboardPlaceholder />
    </AuthGuard>
  );
}
