import type { MetadataRoute } from 'next';

import type { NewsItem, NewsListResponse } from '@/types/news';

const DEFAULT_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'http://localhost:6005';

const normalizeBaseUrl = (value: string): string => value.replace(/\/$/, '');

const resolveSiteBase = (): string => {
  try {
    return new URL(DEFAULT_APP_URL).origin;
  } catch {
    return 'http://localhost:6005';
  }
};

const resolveApiBase = (): string => {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) return normalizeBaseUrl(envBase);
  return `${normalizeBaseUrl(resolveSiteBase())}/api`;
};

const fetchNewsItems = async (): Promise<NewsItem[]> => {
  const apiBase = resolveApiBase();
  const pageSize = 50;
  const items: NewsItem[] = [];
  let page = 1;

  while (true) {
    try {
      const response = await fetch(`${apiBase}/news?page=${page}&pageSize=${pageSize}`, {
        next: { revalidate: 300 },
      });
      if (!response.ok) {
        break;
      }
      const data = (await response.json()) as NewsListResponse;
      if (!data?.items?.length) {
        break;
      }
      items.push(...data.items);
      if (data.items.length < pageSize) {
        break;
      }
      page += 1;
    } catch {
      break;
    }
  }

  return items;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteBase = resolveSiteBase();
  const now = new Date().toISOString();
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${siteBase}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteBase}/news`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  const newsItems = await fetchNewsItems();
  newsItems.forEach((item) => {
    entries.push({
      url: `${siteBase}/news/${item.slug}`,
      lastModified: item.updatedAt ?? item.createdAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  });

  return entries;
}
