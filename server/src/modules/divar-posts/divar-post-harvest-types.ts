import type { QueueLocationScope } from '@prisma/client';

export const DIVAR_SEARCH_URL = 'https://api.divar.ir/v8/postlist/w/search';
export const PAGINATION_TYPE = 'type.googleapis.com/post_list.PaginationData';
export const SERVER_PAYLOAD_TYPE = 'type.googleapis.com/widgets.SearchData.ServerPayload';
export const MAX_REQUESTS_PER_SECOND = 3;
export const RATE_LIMIT_WINDOW_MS = 1000;
export const DEFAULT_MAX_PAGES_PER_COMBO = 20;
export const DEFAULT_MAX_PAGES_PER_COMBO_NIGHT = 5;
export const DEFAULT_REFETCH_WINDOW_MINUTES = 4 * 60;
export const TEHRAN_TZ = 'Asia/Tehran';

export type PaginationPayload = {
  '@type': string;
  page: number;
  layer_page: number;
  cumulative_widgets_count: number;
  last_post_date?: string;
};

export interface CategoryScope {
  id: string;
  slug: string;
  name: string;
  displayPath: string;
  path: string;
}

export interface LocationScope {
  scope: QueueLocationScope;
  apiId: number;
  slug: string;
  name: string;
  provinceId: number | null;
  cityId: number | null;
  label: string;
}

export interface DivarWidget {
  widget_type?: string;
  data?: Record<string, unknown> & { token?: string; title?: string };
}

export interface DivarSearchResponse {
  list_widgets?: DivarWidget[];
  pagination?: {
    data?: {
      last_post_date?: string;
      cumulative_widgets_count?: number;
    };
  };
}

export interface HarvestSummary {
  categories: number;
  locations: number;
  combinations: number;
  enqueued: number;
}
