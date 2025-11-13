import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, unstable_setRequestLocale } from 'next-intl/server';

import { inter } from '@/app/fonts';
import { Providers } from '@/app/providers';
import { Footer } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import './globals.css';

const DEFAULT_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:6005';

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
    default: 'ماهان داشبورد',
    template: '%s | ماهان داشبورد',
  },
  description: 'مرور و مدیریت آگهی‌های دیوار در پنل ماهان.',
  openGraph: {
    title: 'ماهان داشبورد',
    description: 'مرور و مدیریت آگهی‌های دیوار در پنل ماهان.',
    url: DEFAULT_APP_URL,
    siteName: 'ماهان',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ماهان داشبورد',
    description: 'مرور و مدیریت آگهی‌های دیوار در پنل ماهان.',
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  unstable_setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={inter.variable}>
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
          <Providers>
            <div className="min-h-screen bg-background text-foreground">
              <SiteHeader />
              <main className="w-full px-0 py-12">{children}</main>
              <Footer />
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
