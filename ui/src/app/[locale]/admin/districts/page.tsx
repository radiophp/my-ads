import { unstable_setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AdminDistrictsClient } from '@/components/admin/admin-districts-client';
import { defaultLocale, locales } from '@/i18n/config';
import type { Locale } from '@/types/locale';

export function generateStaticParams() {
  return locales.filter((locale) => locale !== defaultLocale).map((locale) => ({ locale }));
}

type LocaleAdminDistrictsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocaleAdminDistrictsPage({
  params,
}: LocaleAdminDistrictsPageProps) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  unstable_setRequestLocale(locale as Locale);

  return <AdminDistrictsClient />;
}
