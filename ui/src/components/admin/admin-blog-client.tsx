import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminBlogManager } from './admin-blog-manager';

export function AdminBlogClient() {
  return (
    <AdminGuard>
      <AdminBlogManager />
    </AdminGuard>
  );
}
