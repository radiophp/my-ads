import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminArkaSessionsManager } from './admin-arka-sessions-manager';

export function AdminArkaSessionsClient() {
  return (
    <AdminGuard>
      <AdminArkaSessionsManager />
    </AdminGuard>
  );
}
