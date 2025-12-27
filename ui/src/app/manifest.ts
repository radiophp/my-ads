import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  const isDev = process.env.NODE_ENV === 'development';
  const appName = isDev ? 'ماهان فایل (توسعه)' : 'ماهان فایل';
  const appShortName = isDev ? 'ماهان فایل توسعه' : 'ماهان فایل';
  const themeColor = isDev ? '#e7e9c4' : undefined;

  const manifest: MetadataRoute.Manifest = {
    name: appName,
    short_name: appShortName,
    description: 'مدیریت آگهی‌های ماهان فایل در هر زمان و هر مکان.',
    start_url: '/',
    display: 'standalone',
    background_color: '#464646',
    lang: 'fa',
    categories: ['business', 'productivity'],
    orientation: 'portrait',
    icons: [
      {
        src: '/fav/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/fav/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/fav/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/fav/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/fav/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
  };
  if (themeColor) {
    manifest.theme_color = themeColor;
  }
  return manifest;
}
