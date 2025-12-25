import { headers } from 'next/headers';
import type { WebsiteSettings } from '@/types/website-settings';

const normalizeBaseUrl = (value: string): string => value.replace(/\/$/, '');

const resolveApiBase = async (): Promise<string> => {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) return normalizeBaseUrl(envBase);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return `${normalizeBaseUrl(appUrl)}/api`;

  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}/api`;

  return '';
};

export const fetchWebsiteSettings = async (): Promise<WebsiteSettings | null> => {
  const apiBase = await resolveApiBase();
  if (!apiBase) return null;
  try {
    const response = await fetch(`${apiBase}/website-settings`, {
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as WebsiteSettings;
  } catch {
    return null;
  }
};
