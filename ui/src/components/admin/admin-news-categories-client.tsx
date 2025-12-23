import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminNewsCategoriesManager } from './admin-news-categories-manager';

export function AdminNewsCategoriesClient() {
  return (
    <AdminGuard>
      <AdminNewsCategoriesManager />
    </AdminGuard>
  );
}
