import { unstable_setRequestLocale } from 'next-intl/server';

import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { defaultLocale } from '@/i18n/config';

export default function DashboardPage() {
  unstable_setRequestLocale(defaultLocale);
  return <DashboardClient />;
}
