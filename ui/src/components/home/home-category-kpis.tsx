import { headers } from 'next/headers';

import type { DivarPostCategoryCount } from '@/types/divar-posts';
import { HomeCategoryKpisClient } from '@/components/home/home-category-kpis-client';

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

const fetchCategoryCounts = async (): Promise<{
  counts: DivarPostCategoryCount[];
  hasError: boolean;
}> => {
  const apiBase = await resolveApiBase();
  if (!apiBase) {
    return { counts: [], hasError: true };
  }

  try {
    const response = await fetch(`${apiBase}/divar-posts/category-counts`, {
      next: { revalidate: 600 },
    });
    if (!response.ok) {
      return { counts: [], hasError: true };
    }
    const data = (await response.json()) as DivarPostCategoryCount[];
    if (!Array.isArray(data)) {
      return { counts: [], hasError: true };
    }
    return { counts: data, hasError: false };
  } catch {
    return { counts: [], hasError: true };
  }
};

export async function HomeCategoryKpis() {
  const { counts, hasError } = await fetchCategoryCounts();
  return <HomeCategoryKpisClient counts={counts} hasError={hasError} />;
}
