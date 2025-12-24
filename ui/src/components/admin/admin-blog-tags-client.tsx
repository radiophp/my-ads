import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminBlogTagsManager } from './admin-blog-tags-manager';

export function AdminBlogTagsClient() {
  return (
    <AdminGuard>
      <AdminBlogTagsManager />
    </AdminGuard>
  );
}
