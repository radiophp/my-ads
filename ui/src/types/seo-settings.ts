export type SeoPageKey = 'home' | 'news-list' | 'blog-list' | 'about' | 'dashboard';

export type SeoSetting = {
  pageKey: SeoPageKey;
  title: string | null;
  description: string | null;
  keywords: string | null;
  updatedAt?: string;
};
