export const SEO_PAGE_KEYS = ['home', 'news-list', 'blog-list', 'about', 'dashboard'] as const;

export type SeoPageKey = (typeof SEO_PAGE_KEYS)[number];

const SEO_PAGE_KEY_SET = new Set<string>(SEO_PAGE_KEYS);

export const isSeoPageKey = (value: string): value is SeoPageKey => SEO_PAGE_KEY_SET.has(value);
