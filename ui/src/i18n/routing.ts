import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'fa'] as const,
  defaultLocale: 'fa',
  localePrefix: 'never',
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
export type Locale = (typeof routing.locales)[number];
export const { locales, defaultLocale, localePrefix } = routing;
