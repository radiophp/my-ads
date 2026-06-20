import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

import { BaleMiniAppLogin } from '@/components/bale/bale-miniapp-login';
import { HomeAuthPanel } from '@/components/home/home-auth-panel';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing.login');
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const isBaleMiniApp = params.bale_miniapp === '1';

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      {isBaleMiniApp ? <BaleMiniAppLogin /> : <HomeAuthPanel />}
    </div>
  );
}
