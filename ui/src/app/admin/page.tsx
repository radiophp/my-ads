import { unstable_setRequestLocale } from 'next-intl/server';

import { AdminPackagesClient } from '@/components/admin/admin-packages-client';
import { defaultLocale } from '@/i18n/config';

export default function AdminPage(): JSX.Element {
  unstable_setRequestLocale(defaultLocale);
  return <AdminPackagesClient />;
}
