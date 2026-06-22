import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminUsageLogsManager } from '@/components/admin/admin-usage-logs-manager';

export function AdminUsageLogsClient() {
  return (
    <AdminGuard>
      <AdminUsageLogsManager />
    </AdminGuard>
  );
}
