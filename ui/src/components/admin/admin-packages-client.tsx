'use client';

import type { JSX } from 'react';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminPackagesManager } from '@/components/admin/admin-packages-manager';

export function AdminPackagesClient(): JSX.Element {
  return (
    <AdminGuard>
      <AdminPackagesManager />
    </AdminGuard>
  );
}
