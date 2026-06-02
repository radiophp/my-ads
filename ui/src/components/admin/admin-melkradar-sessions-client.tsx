import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminMelkradarSessionsManager } from './admin-melkradar-sessions-manager';

export function AdminMelkradarSessionsClient() {
  return (
    <AdminGuard>
      <AdminMelkradarSessionsManager />
    </AdminGuard>
  );
}
