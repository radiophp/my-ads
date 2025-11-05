import createMiddleware from 'next-intl/middleware';

import { defaultLocale, localePrefix, locales } from './ui/src/i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
