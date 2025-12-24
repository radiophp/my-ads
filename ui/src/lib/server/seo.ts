import { headers } from 'next/headers';
import type { Metadata } from 'next';
import type { SeoSetting } from '@/types/seo-settings';

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

const resolveAppBase = async (): Promise<string> => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (appUrl) return normalizeBaseUrl(appUrl);

  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;

  return '';
};

const parseKeywords = (value?: string | null): string[] | undefined => {
  if (!value) return undefined;
  const keywords = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return keywords.length > 0 ? keywords : undefined;
};

export const fetchSeoSetting = async (pageKey: string): Promise<SeoSetting | null> => {
  const apiBase = await resolveApiBase();
  if (!apiBase) return null;
  try {
    const response = await fetch(`${apiBase}/seo-settings/${pageKey}`, {
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as SeoSetting;
  } catch {
    return null;
  }
};

type BuildSeoMetadataOptions = {
  pageKey: SeoSetting['pageKey'];
  defaultTitle: string;
  defaultDescription?: string;
  canonicalPath?: string;
};

export const buildSeoMetadata = async ({
  pageKey,
  defaultTitle,
  defaultDescription,
  canonicalPath,
}: BuildSeoMetadataOptions): Promise<Metadata> => {
  const setting = await fetchSeoSetting(pageKey);
  const title = setting?.title?.trim() || defaultTitle;
  const description = setting?.description?.trim() || defaultDescription;
  const keywords = parseKeywords(setting?.keywords);
  const appBase = await resolveAppBase();
  const canonicalUrl = appBase && canonicalPath ? `${appBase}${canonicalPath}` : undefined;

  return {
    title,
    description,
    keywords,
    alternates: canonicalUrl
      ? {
          canonical: canonicalUrl,
        }
      : undefined,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
    },
  };
};
