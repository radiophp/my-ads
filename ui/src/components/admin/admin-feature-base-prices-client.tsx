'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminFeatureBasePricesManager } from './admin-feature-base-prices-manager';

export function AdminFeatureBasePricesClient() {
  return (
    <AdminGuard>
      <AdminFeatureBasePricesManager />
    </AdminGuard>
  );
}
