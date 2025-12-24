import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminSeoSettingsManager } from './admin-seo-settings-manager';

export function AdminSeoSettingsClient() {
  return (
    <AdminGuard>
      <AdminSeoSettingsManager />
    </AdminGuard>
  );
}
