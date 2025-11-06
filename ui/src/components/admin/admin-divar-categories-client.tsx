'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminDivarCategoriesManager } from '@/components/admin/admin-divar-categories-manager';

export function AdminDivarCategoriesClient() {
  return (
    <AdminGuard>
      <AdminDivarCategoriesManager />
    </AdminGuard>
  );
}
