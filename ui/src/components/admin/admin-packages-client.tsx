'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminPackagesManager } from '@/components/admin/admin-packages-manager';

export function AdminPackagesClient() {
  return (
    <AdminGuard>
      <AdminPackagesManager />
    </AdminGuard>
  );
}
