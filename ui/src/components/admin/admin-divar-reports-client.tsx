'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminDivarReportsManager } from '@/components/admin/admin-divar-reports-manager';

export function AdminDivarReportsClient() {
  return (
    <AdminGuard>
      <AdminDivarReportsManager />
    </AdminGuard>
  );
}
