'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { locales, Locale, useRouter } from '@/i18n/routing';

const PREFERRED_LOCALE_KEY = 'preferred-locale';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const isLocale = (value: string | null): value is Locale =>
  Boolean(value && (locales as readonly string[]).includes(value));

export function LocaleSwitcher() {
  const t = useTranslations('header');
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const [selectedLocale, setSelectedLocale] = React.useState<Locale>(currentLocale);
  const hasAppliedStoredPreference = React.useRef(false);

  React.useEffect(() => {
    setSelectedLocale(currentLocale);
  }, [currentLocale]);

  const persistPreference = React.useCallback((locale: Locale) => {
    if (typeof document !== 'undefined') {
      document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}`;
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PREFERRED_LOCALE_KEY, locale);
    }
  }, []);

  React.useEffect(() => {
    if (hasAppliedStoredPreference.current) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(PREFERRED_LOCALE_KEY);
    if (isLocale(stored) && stored !== currentLocale) {
      hasAppliedStoredPreference.current = true;
      persistPreference(stored);
      router.refresh();
    }
  }, [currentLocale, persistPreference, router]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value as Locale;
    setSelectedLocale(nextLocale);
    hasAppliedStoredPreference.current = true;
    persistPreference(nextLocale);
    router.refresh();
  };

  return (
    <div className="relative">
      <label htmlFor="locale-switcher" className="sr-only">
        {t('languageLabel')}
      </label>
      <select
        id="locale-switcher"
        className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={selectedLocale}
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
