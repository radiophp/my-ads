import 'server-only';

import type { DivarPostSummary } from '@/types/divar-posts';

const getApiBaseUrl = (): string => {
  const base =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:6200/api';
  if (!base) {
    return '';
  }
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

export async function fetchDivarPostForMetadata(
  id: string,
): Promise<DivarPostSummary | null> {
  if (!id) {
    return null;
  }

  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return null;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/divar-posts/${encodeURIComponent(id)}`, {
      headers: {
        Accept: 'application/json',
      },
      // Cache metadata fetches for a short period to reduce backend load.
      next: {
        revalidate: 300,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as DivarPostSummary;
    return data;
  } catch {
    return null;
  }
}
