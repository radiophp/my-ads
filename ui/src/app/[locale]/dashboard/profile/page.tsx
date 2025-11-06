import type { JSX } from 'react';
import { unstable_setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ProfilePageClient } from '@/components/profile/profile-page-client';
import { defaultLocale, locales } from '@/i18n/config';
import type { Locale } from '@/types/locale';

export function generateStaticParams() {
  return locales.filter((locale) => locale !== defaultLocale).map((locale) => ({ locale }));
}

export default async function LocaleProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<JSX.Element> {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  unstable_setRequestLocale(locale as Locale);

  return <ProfilePageClient />;
}
