'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminDivarFiltersManager } from '@/components/admin/admin-divar-filters-manager';

export function AdminDivarFiltersClient() {
  return (
    <AdminGuard>
      <AdminDivarFiltersManager />
    </AdminGuard>
  );
}

