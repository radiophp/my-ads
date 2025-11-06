'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminCitiesManager } from '@/components/admin/admin-cities-manager';

export function AdminCitiesClient() {
  return (
    <AdminGuard>
      <AdminCitiesManager />
    </AdminGuard>
  );
}
