import { getTranslations } from 'next-intl/server';

import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { buildSeoMetadata } from '@/lib/server/seo';

export async function generateMetadata() {
  const t = await getTranslations('dashboard');
  return buildSeoMetadata({
    pageKey: 'dashboard',
    defaultTitle: t('title'),
    defaultDescription: t('subtitle'),
    canonicalPath: '/dashboard',
  });
}

export default function DashboardPage() {
  return <DashboardClient />;
}
