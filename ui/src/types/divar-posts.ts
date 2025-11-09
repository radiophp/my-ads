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
