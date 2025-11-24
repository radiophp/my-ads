import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, unstable_setRequestLocale } from 'next-intl/server';

import { inter } from '@/app/fonts';
import { Providers } from '@/app/providers';
import { SiteHeader } from '@/components/layout/site-header';
import './globals.css';

const DEFAULT_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:6005';
const THEME_STORAGE_KEY = 'ui-theme';
const themeInitializer = `
(() => {
  try {
    const storageKey = '${THEME_STORAGE_KEY}';
    const stored = localStorage.getItem(storageKey);
    const theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
  } catch (error) {
    // no-op
  }
})();
`;

const metadataBase = (() => {
  try {
    return new URL(DEFAULT_APP_URL);
  } catch {
    return undefined;
  }
})();

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: 'ماهان فایل | فروش اجاره آپارتمان زمین و ویلا',
    template: '%s | ماهان فایل | فروش اجاره آپارتمان زمین و ویلا',
  },
  description: 'مرور و مدیریت آگهی‌های دیوار در پنل ماهان.',
  openGraph: {
    title: 'ماهان فایل | فروش اجاره آپارتمان زمین و ویلا',
    description: 'مرور و مدیریت آگهی‌های دیوار در پنل ماهان.',
    url: DEFAULT_APP_URL,
    siteName: 'ماهان',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ماهان فایل | فروش اجاره آپارتمان زمین و ویلا',
    description: 'مرور و مدیریت آگهی‌های دیوار در پنل ماهان.',
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  unstable_setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} dark`}
      data-theme="dark"
    >
      <body className={`${inter.className} h-screen overflow-hidden`}>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
          <Providers>
            <div className="flex h-screen flex-col bg-background text-foreground">
              <SiteHeader />
              <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
