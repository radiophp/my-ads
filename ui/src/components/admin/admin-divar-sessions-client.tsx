'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminDivarSessionsManager } from './admin-divar-sessions-manager';

export function AdminDivarSessionsClient() {
  return (
    <AdminGuard>
      <AdminDivarSessionsManager />
    </AdminGuard>
  );
}
