import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { headers } from 'next/headers';
import { getLocale, getMessages, unstable_setRequestLocale } from 'next-intl/server';

import { inter } from '@/app/fonts';
import { Providers } from '@/app/providers';
import { SiteHeader } from '@/components/layout/site-header';
import { Footer } from '@/components/layout/site-footer';
import { PathnameSync } from '@/components/layout/pathname-sync';
import './globals.css';

const DEFAULT_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:6005';
const isDev = process.env.NODE_ENV === 'development';
const titlePrefix = isDev ? 'توسعه | ' : '';
const appleAppName = isDev ? 'ماهان فایل (توسعه)' : 'ماهان فایل';
const THEME_STORAGE_KEY = 'ui-theme';
const PWA_SPLASH_STORAGE_KEY = 'pwa-splash-shown';
const PWA_SPLASH_DURATION_MS = 5000;
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
const pwaSplashInitializer = `
(() => {
  try {
    const key = '${PWA_SPLASH_STORAGE_KEY}';
    const hasShown = sessionStorage.getItem(key) === '1';
    const media = window.matchMedia('(display-mode: standalone)');
    const isStandalone = media.matches || (window.navigator && window.navigator.standalone);
    if (!isStandalone || hasShown) {
      return;
    }
    document.documentElement.dataset.pwaSplash = '1';
    sessionStorage.setItem(key, '1');
    window.setTimeout(() => {
      delete document.documentElement.dataset.pwaSplash;
    }, ${PWA_SPLASH_DURATION_MS});
  } catch (error) {
    // no-op
  }
})();
`;
const pwaInstallInitializer = `
(() => {
  try {
    const key = '__pwaPromptEvent';
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      window[key] = event;
      window.dispatchEvent(new Event('pwa:installable'));
    });
    window.addEventListener('appinstalled', () => {
      window[key] = null;
      window.dispatchEvent(new Event('pwa:installed'));
    });
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
    default: `${titlePrefix}ماهان فایل | فروش اجاره آپارتمان زمین و ویلا`,
    template: `${titlePrefix}%s | ماهان فایل | فروش اجاره آپارتمان زمین و ویلا`,
  },
  description: 'مرور و مدیریت آگهی‌های دیوار در پنل ماهان.',
  openGraph: {
    title: `${titlePrefix}ماهان فایل | فروش اجاره آپارتمان زمین و ویلا`,
    description: 'مرور و مدیریت آگهی‌های دیوار در پنل ماهان.',
    url: DEFAULT_APP_URL,
    siteName: 'ماهان',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${titlePrefix}ماهان فایل | فروش اجاره آپارتمان زمین و ویلا`,
    description: 'مرور و مدیریت آگهی‌های دیوار در پنل ماهان.',
  },
  icons: {
    icon: [
      { url: '/fav/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/fav/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/fav/favicon.ico', type: 'image/x-icon' },
    ],
    apple: [{ url: '/fav/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: appleAppName,
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  unstable_setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === 'fa' ? 'rtl' : 'ltr';
  const requestHeaders = await headers();
  const pathname = requestHeaders.get('x-pathname') ?? '';

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} dark`}
      data-theme="dark"
    >
      <head>
        <link rel="apple-touch-startup-image" href="/logo-mahan-file.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <script dangerouslySetInnerHTML={{ __html: pwaSplashInitializer }} />
        <script dangerouslySetInnerHTML={{ __html: pwaInstallInitializer }} />
      </head>
      <body
        className={`${inter.className} min-h-screen overflow-x-hidden bg-background text-foreground ${isDev ? 'border-t border-yellow-400' : ''}`}
        data-pathname={pathname}
      >
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
        <div
          id="pwa-splash"
          className="fixed inset-0 z-[60] hidden items-center justify-center bg-background"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- splash needs a static image */}
          <img
            src="/logo-mahan-file.png"
            alt="Mahan File"
            className="h-16 w-auto max-w-[75vw] animate-splash-float motion-reduce:animate-none sm:h-20"
          />
        </div>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
          <Providers>
            <PathnameSync />
            <div id="app-shell" className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="min-h-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
                {children}
              </main>
              <Footer />
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
