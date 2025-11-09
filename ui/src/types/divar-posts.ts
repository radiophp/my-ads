export type PostToAnalyzeStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type PostToAnalyze = {
  id: string;
  readQueueId: string;
  externalId: string;
  source: string;
  status: PostToAnalyzeStatus;
  seoTitle: string | null;
  createdAt: string;
  updatedAt: string;
  payload: unknown;
};

export type PaginatedPostsToAnalyze = {
  items: PostToAnalyze[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};

export type DivarPostSummary = {
  id: string;
  externalId: string;
  title: string | null;
  description: string | null;
  priceTotal: number | null;
  rentAmount: number | null;
  pricePerSquare: number | null;
  area: number | null;
  cityName: string | null;
  districtName: string | null;
  provinceName: string | null;
  categorySlug: string;
  businessType: string | null;
  publishedAt: string | null;
  publishedAtJalali: string | null;
  createdAt: string;
  permalink: string | null;
  imageUrl: string | null;
  mediaCount: number;
  medias: Array<{
    id: string;
    url: string;
    thumbnailUrl: string | null;
    alt: string | null;
  }>;
};

export type DivarPostListResponse = {
  items: DivarPostSummary[];
  nextCursor: string | null;
  hasMore: boolean;
};
