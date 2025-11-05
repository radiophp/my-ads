import { unstable_setRequestLocale } from 'next-intl/server';

import { HomeView } from '@/components/home/home-view';
import { defaultLocale } from '@/i18n/config';

export default async function IndexPage() {
  unstable_setRequestLocale(defaultLocale);
  return <HomeView />;
}
