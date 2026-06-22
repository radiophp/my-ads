import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminUsersManager } from '@/components/admin/admin-users-manager';

export function AdminUsersClient() {
  return (
    <AdminGuard>
      <AdminUsersManager />
    </AdminGuard>
  );
}
