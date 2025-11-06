import { unstable_setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AdminProvincesClient } from '@/components/admin/admin-provinces-client';
import { defaultLocale, locales } from '@/i18n/config';
import type { Locale } from '@/types/locale';

export function generateStaticParams() {
  return locales.filter((locale) => locale !== defaultLocale).map((locale) => ({ locale }));
}

type LocaleAdminProvincesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocaleAdminProvincesPage({
  params,
}: LocaleAdminProvincesPageProps) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  unstable_setRequestLocale(locale as Locale);

  return <AdminProvincesClient />;
}
