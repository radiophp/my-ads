'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminDistrictsManager } from '@/components/admin/admin-districts-manager';

export function AdminDistrictsClient() {
  return (
    <AdminGuard>
      <AdminDistrictsManager />
    </AdminGuard>
  );
}
