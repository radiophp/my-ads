'use client';

import * as React from 'react';
import type { JSX } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { locales, Locale, usePathname, useRouter } from '@/i18n/routing';

export function LocaleSwitcher(): JSX.Element {
  const t = useTranslations('header');
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    router.replace(pathname, { locale: event.target.value as Locale });
  };

  return (
    <div className="relative">
      <label htmlFor="locale-switcher" className="sr-only">
        {t('languageLabel')}
      </label>
      <select
        id="locale-switcher"
        className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={currentLocale}
        onChange={handleChange}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {t(`language.${locale}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
