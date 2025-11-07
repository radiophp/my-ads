export type DivarCategory = {
  id: string;
  slug: string;
  name: string;
  displayPath: string;
  path: string;
  parentId: string | null;
  parentName: string | null;
  parentSlug: string | null;
  depth: number;
  position: number;
  childrenCount: number;
  isActive: boolean;
  allowPosting: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DivarCategoryFilterSummary = {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  displayPath: string;
  updatedAt: string;
};

export type DivarCategoryFilterDetail = {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  displayPath: string;
  payload: unknown;
  updatedAt: string;
};
