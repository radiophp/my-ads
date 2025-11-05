import { createNavigation } from 'next-intl/navigation';

import { defaultLocale, localePrefix, locales } from './config';

export { defaultLocale, localePrefix, locales } from './config';

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
  defaultLocale,
  localePrefix,
});

export type Locale = (typeof locales)[number];
