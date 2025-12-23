import type { MetadataRoute } from 'next';

const DEFAULT_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:6005';

const resolveHost = (): string | null => {
  try {
    return new URL(DEFAULT_APP_URL).origin;
  } catch {
    return null;
  }
};

export default function robots(): MetadataRoute.Robots {
  const host = resolveHost();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/admin', '/api', '/test'],
    },
    sitemap: host ? `${host}/sitemap.xml` : undefined,
    host: host ?? undefined,
  };
}
