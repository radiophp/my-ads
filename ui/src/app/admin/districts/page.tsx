import { unstable_setRequestLocale } from 'next-intl/server';

import { AdminDistrictsClient } from '@/components/admin/admin-districts-client';
import { defaultLocale } from '@/i18n/config';

export default function AdminDistrictsPage() {
  unstable_setRequestLocale(defaultLocale);
  return <AdminDistrictsClient />;
}
