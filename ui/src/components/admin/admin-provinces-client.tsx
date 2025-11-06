'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminProvincesManager } from '@/components/admin/admin-provinces-manager';

export function AdminProvincesClient() {
  return (
    <AdminGuard>
      <AdminProvincesManager />
    </AdminGuard>
  );
}
