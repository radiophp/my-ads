export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BlogTag = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type BlogSource = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BlogItem = {
  id: string;
  title: string;
  slug: string;
  shortText?: string | null;
  content?: string | null;
  mainImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: BlogCategory | null;
  source?: BlogSource | null;
  tags: BlogTag[];
};

export type BlogListResponse = {
  items: BlogItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateBlogPayload = {
  title: string;
  slug?: string;
  shortText?: string;
  content: string;
  mainImageUrl?: string;
  categoryId: string;
  sourceId?: string;
  tagIds?: string[];
};

export type UpdateBlogPayload = Partial<CreateBlogPayload>;

export type CreateBlogCategoryPayload = {
  name: string;
  slug?: string;
  isActive?: boolean;
};

export type UpdateBlogCategoryPayload = Partial<CreateBlogCategoryPayload>;

export type CreateBlogTagPayload = {
  name: string;
  slug?: string;
};

export type UpdateBlogTagPayload = Partial<CreateBlogTagPayload>;

export type UpdateBlogSourcePayload = {
  name?: string;
  slug?: string;
  isActive?: boolean;
};
