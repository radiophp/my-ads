import { unstable_setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AdminDivarCategoriesClient } from '@/components/admin/admin-divar-categories-client';
import { defaultLocale, locales } from '@/i18n/config';
import type { Locale } from '@/types/locale';

export function generateStaticParams() {
  return locales.filter((locale) => locale !== defaultLocale).map((locale) => ({ locale }));
}

type LocaleAdminDivarCategoriesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocaleAdminDivarCategoriesPage({
  params,
}: LocaleAdminDivarCategoriesPageProps) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  unstable_setRequestLocale(locale as Locale);

  return <AdminDivarCategoriesClient />;
}
