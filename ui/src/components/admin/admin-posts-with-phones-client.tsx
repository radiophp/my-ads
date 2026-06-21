import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminPostsWithPhonesManager } from './admin-posts-with-phones-manager';

export function AdminPostsWithPhonesClient() {
  return (
    <AdminGuard>
      <AdminPostsWithPhonesManager />
    </AdminGuard>
  );
}
