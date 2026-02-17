'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminDiscountCodesManager } from '@/components/admin/admin-discount-codes-manager';

export function AdminDiscountCodesClient() {
  return (
    <AdminGuard>
      <AdminDiscountCodesManager />
    </AdminGuard>
  );
}
