import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminPaymentsManager } from '@/components/admin/admin-payments-manager';

export function AdminPaymentsClient() {
  return (
    <AdminGuard>
      <AdminPaymentsManager />
    </AdminGuard>
  );
}
