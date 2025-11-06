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
  createdAt: string;
  updatedAt: string;
};
