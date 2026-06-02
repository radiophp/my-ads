import type { DivarPostListItemDto } from '@app/modules/divar-posts/dto/divar-post.dto';

export type FeaturedPostAdminItemDto = {
  id: string;
  postId: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  post: {
    id: string;
    code: number;
    externalId: string;
    title: string | null;
  };
};

export type FeaturedPostLookupDto = {
  found: boolean;
  post: DivarPostListItemDto | null;
};
