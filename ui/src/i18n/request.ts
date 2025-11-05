import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

import { locales, defaultLocale } from './routing';

export default getRequestConfig(async () => {
  const headerList = await headers();
  const locale = headerList.get('x-next-intl-locale') ?? defaultLocale;

  if (!locales.includes(locale as (typeof locales)[number])) {
    return {
      locale: defaultLocale,
      messages: (await import(`../messages/${defaultLocale}.json`)).default,
    };
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
