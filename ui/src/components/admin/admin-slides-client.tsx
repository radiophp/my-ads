import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminSlidesManager } from './admin-slides-manager';

export function AdminSlidesClient() {
  return (
    <AdminGuard>
      <AdminSlidesManager />
    </AdminGuard>
  );
}
