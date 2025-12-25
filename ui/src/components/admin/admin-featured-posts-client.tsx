import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminFeaturedPostsManager } from './admin-featured-posts-manager';

export function AdminFeaturedPostsClient() {
  return (
    <AdminGuard>
      <AdminFeaturedPostsManager />
    </AdminGuard>
  );
}
