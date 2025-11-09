import type { PostAnalysisStatus, Prisma } from '@prisma/client';

export type PostToAnalyzeItemDto = {
  id: string;
  readQueueId: string;
  externalId: string;
  source: string;
  status: PostAnalysisStatus;
  seoTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
  payload: Prisma.JsonValue;
};

export type PaginatedPostsToAnalyzeDto = {
  items: PostToAnalyzeItemDto[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};
