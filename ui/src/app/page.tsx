import { getTranslations } from 'next-intl/server';

import { HomeLanding } from '@/components/home/home-landing';
import { buildSeoMetadata } from '@/lib/server/seo';

export async function generateMetadata() {
  const t = await getTranslations('landing');
  return buildSeoMetadata({
    pageKey: 'home',
    defaultTitle: t('title'),
    defaultDescription: t('subtitle'),
    canonicalPath: '/',
  });
}

export default function IndexPage() {
  return <HomeLanding />;
}
