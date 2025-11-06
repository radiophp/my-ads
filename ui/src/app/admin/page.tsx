import { unstable_setRequestLocale } from 'next-intl/server';

import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { defaultLocale } from '@/i18n/config';

export default function AdminPage() {
  unstable_setRequestLocale(defaultLocale);
  return <AdminDashboard />;
}
