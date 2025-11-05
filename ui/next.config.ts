import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';
import createNextIntlPlugin from 'next-intl/plugin';

const envFiles = [
  '../.env',
  '../.env.local',
  '../.env.development',
  '../.env.development.local',
  '../.env.production',
  '../.env.production.local',
  '../.env.test'
];
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
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = `http://localhost:${defaultPort}`;
}
if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:6200/api';
}

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  sw: 'service-worker.js',
  fallbacks: {
    document: '/offline'
  }
} as any);

const i18nRequestRelativePath = './src/i18n/request.ts';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
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
      'next-intl/config': i18nRequestRelativePath
    }
  }
};

nextConfig.experimental ??= {};
nextConfig.experimental.serverActions = {
  bodySizeLimit: '2mb'
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

configWithPlugins.turbopack ??= {};
const turbopackConfig = configWithPlugins.turbopack as Record<string, unknown>;
turbopackConfig.resolveAlias ??= {};
(turbopackConfig.resolveAlias as Record<string, string>)['next-intl/config'] = i18nRequestRelativePath;

export default configWithPlugins;
