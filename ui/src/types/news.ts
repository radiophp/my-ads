export type NewsCategory = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NewsTag = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type NewsItem = {
  id: string;
  title: string;
  slug: string;
  shortText?: string | null;
  content?: string | null;
  mainImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: NewsCategory | null;
  tags: NewsTag[];
};

export type NewsListResponse = {
  items: NewsItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateNewsPayload = {
  title: string;
  slug?: string;
  shortText?: string;
  content: string;
  mainImageUrl?: string;
  categoryId: string;
  tagIds?: string[];
};

export type UpdateNewsPayload = Partial<CreateNewsPayload>;

export type CreateNewsCategoryPayload = {
  name: string;
  slug?: string;
  isActive?: boolean;
};

export type UpdateNewsCategoryPayload = Partial<CreateNewsCategoryPayload>;

export type CreateNewsTagPayload = {
  name: string;
  slug?: string;
};

export type UpdateNewsTagPayload = Partial<CreateNewsTagPayload>;
