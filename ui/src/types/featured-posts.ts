import type { DivarPostSummary } from '@/types/divar-posts';

export type FeaturedPostAdminItem = {
  id: string;
  postId: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  post: {
    id: string;
    code: number;
    externalId: string;
    title: string | null;
  };
};

export type FeaturedPostsAdminListResponse = {
  items: FeaturedPostAdminItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type FeaturedPostLookupResponse = {
  found: boolean;
  post: DivarPostSummary | null;
};

export type FeaturedPostsResponse = DivarPostSummary[];

export type CreateFeaturedPostPayload = {
  code?: number;
  externalId?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateFeaturedPostPayload = {
  sortOrder?: number;
  isActive?: boolean;
};
