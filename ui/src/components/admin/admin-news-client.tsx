import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminNewsManager } from './admin-news-manager';

export function AdminNewsClient() {
  return (
    <AdminGuard>
      <AdminNewsManager />
    </AdminGuard>
  );
}
