import { unstable_setRequestLocale } from 'next-intl/server';

import { AdminCitiesClient } from '@/components/admin/admin-cities-client';
import { defaultLocale } from '@/i18n/config';

export default function AdminCitiesPage() {
  unstable_setRequestLocale(defaultLocale);
  return <AdminCitiesClient />;
}
