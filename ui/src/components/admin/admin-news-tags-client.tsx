import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminNewsTagsManager } from './admin-news-tags-manager';

export function AdminNewsTagsClient() {
  return (
    <AdminGuard>
      <AdminNewsTagsManager />
    </AdminGuard>
  );
}
