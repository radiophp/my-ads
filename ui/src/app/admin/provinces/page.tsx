import { unstable_setRequestLocale } from 'next-intl/server';

import { AdminProvincesClient } from '@/components/admin/admin-provinces-client';
import { defaultLocale } from '@/i18n/config';

export default function AdminProvincesPage() {
  unstable_setRequestLocale(defaultLocale);
  return <AdminProvincesClient />;
}
