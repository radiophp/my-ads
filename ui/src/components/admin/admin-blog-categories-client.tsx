import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminBlogCategoriesManager } from './admin-blog-categories-manager';

export function AdminBlogCategoriesClient() {
  return (
    <AdminGuard>
      <AdminBlogCategoriesManager />
    </AdminGuard>
  );
}
