export type Slide = {
  id: string;
  title?: string | null;
  description?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  imageDesktopUrl: string;
  imageTabletUrl?: string | null;
  imageMobileUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SlideListResponse = {
  items: Slide[];
  total: number;
  page: number;
  pageSize: number;
};
