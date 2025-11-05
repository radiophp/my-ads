import { unstable_setRequestLocale } from 'next-intl/server';

import { notFound } from 'next/navigation';

import { HomeView } from '@/components/home/home-view';
import { defaultLocale, locales } from '@/i18n/config';
import type { Locale } from '@/types/locale';

export function generateStaticParams() {
  return locales.filter((locale) => locale !== defaultLocale).map((locale) => ({ locale }));
}

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  unstable_setRequestLocale(locale as Locale);
  return <HomeView />;
}
