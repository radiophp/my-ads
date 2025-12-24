import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';
import createNextIntlPlugin from 'next-intl/plugin';

const nodeEnv = process.env.NODE_ENV ?? 'development';

const baseEnvFiles = ['../.env', '../.env.local'];
const envByMode: Record<string, string[]> = {
  development: ['../.env.development', '../.env.development.local'],
  production: ['../.env.production', '../.env.production.local'],
  test: ['../.env.test'],
};

const envFiles = [...baseEnvFiles, ...(envByMode[nodeEnv] ?? [])];

envFiles.forEach((file) => {
  loadEnv({ path: resolve(process.cwd(), file), override: true });
});

const defaultPort = process.env.NEXT_UI_PORT ?? '6005';
if (!process.env.PORT) {
  process.env.PORT = defaultPort;
}
if (!process.env.NEXT_UI_PORT) {
  process.env.NEXT_UI_PORT = defaultPort;
}
const defaultAppUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://mahan.toncloud.observer'
    : `http://localhost:${defaultPort}`;
const defaultApiBaseUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://mahan.toncloud.observer/api'
    : 'http://localhost:6200/api';

const mapTileBaseUrl =
  process.env.NEXT_PUBLIC_MAP_TILE_BASE_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://map.mahanfile.com'
    : 'https://dev-map.mahanfile.com');

if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = defaultAppUrl;
}
if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  process.env.NEXT_PUBLIC_API_BASE_URL = defaultApiBaseUrl;
}
if (!process.env.APP_URL) {
  process.env.APP_URL = process.env.NEXT_PUBLIC_APP_URL;
}
if (!process.env.API_BASE_URL) {
  process.env.API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
}

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  sw: 'service-worker.js',
  fallbacks: {
    document: '/offline',
  },
  workboxOptions: {
    // Keep push handlers even when the generated service worker overwrites the file
    importScripts: ['push-sw.js'],
    runtimeCaching: [
      {
        // Always go to network for storage assets to avoid opaque response blocks
        urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/storage/'),
        handler: 'NetworkOnly',
        options: {
          cacheName: 'storage-bypass',
        },
      },
      {
        // Always go to network for map tiles/styles to avoid SW interception issues
        urlPattern: ({ url }: { url: URL }) => {
          const hosts = ['dev-map.mahanfile.com', 'map.mahanfile.com'];
          try {
            const mapHost = new URL(mapTileBaseUrl).hostname;
            if (!hosts.includes(mapHost)) {
              hosts.push(mapHost);
            }
          } catch {
            // ignore parse errors
          }
          return hosts.includes(url.hostname);
        },
        handler: 'NetworkOnly',
        options: {
          cacheName: 'map-tiles-bypass',
        },
      },
    ],
  },
} as any);

const i18nRequestRelativePath = './src/i18n/request.ts';

const imageRemotePatterns = [
  {
    protocol: 'https',
    hostname: 'dev.mahanfile.com',
    pathname: '/storage/**',
  },
  {
    protocol: 'https',
    hostname: 'mahanfile.com',
    pathname: '/storage/**',
  },
] as const satisfies NonNullable<NextConfig['images']>['remotePatterns'];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    remotePatterns: imageRemotePatterns,
    domains: imageRemotePatterns.map((pattern) => pattern.hostname),
  },
  webpack(config) {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    const context = config.context ?? process.cwd();
    config.resolve.alias['next-intl/config'] = resolve(context, i18nRequestRelativePath);
    return config;
  },
  turbopack: {
    resolveAlias: {
      'next-intl/config': i18nRequestRelativePath,
    },
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const configWithPlugins = withNextIntl(withPWA(nextConfig)) as NextConfig & {
  experimental?: Record<string, unknown>;
  turbopack?: Record<string, unknown>;
};

const experimentalConfig = configWithPlugins.experimental as Record<string, unknown> | undefined;
if (experimentalConfig?.turbo) {
  delete experimentalConfig.turbo;
}

if (configWithPlugins.experimental) {
  (configWithPlugins.experimental as Record<string, unknown>).serverActions ??= {
    bodySizeLimit: '2mb',
  };
}

configWithPlugins.turbopack ??= {};
const turbopackConfig = configWithPlugins.turbopack as Record<string, unknown>;
turbopackConfig.resolveAlias ??= {};
(turbopackConfig.resolveAlias as Record<string, string>)['next-intl/config'] =
  i18nRequestRelativePath;

configWithPlugins.images ??= {};
configWithPlugins.images.remotePatterns = imageRemotePatterns;
configWithPlugins.images.domains = imageRemotePatterns.map((pattern) => pattern.hostname);

export default configWithPlugins;
