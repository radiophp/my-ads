import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mahan File',
    short_name: 'Mahan File',
    description: 'Manage your Mahan File listings anywhere with offline support.',
    start_url: '/',
    display: 'standalone',
    background_color: '#464646',
    theme_color: '#e7e9c4',
    lang: 'fa',
    categories: ['business', 'productivity'],
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/icons/favicon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      }
    ],
  };
}
