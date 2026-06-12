import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

import { HomeAuthPanel } from '@/components/home/home-auth-panel';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing.login');
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <HomeAuthPanel />
    </div>
  );
}
