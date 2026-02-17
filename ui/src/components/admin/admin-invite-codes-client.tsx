'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminInviteCodesManager } from '@/components/admin/admin-invite-codes-manager';

export function AdminInviteCodesClient() {
  return (
    <AdminGuard>
      <AdminInviteCodesManager />
    </AdminGuard>
  );
}
