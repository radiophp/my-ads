'use client';

import type { ReactNode } from 'react';
import {
  Boxes,
  BarChart3,
  GitBranch,
  Map,
  MapPin,
  Route,
  SlidersHorizontal,
  Newspaper,
  Bell,
  KeyRound,
  ScrollText,
  Tag,
  Rss,
  BookOpenText,
  Image as ImageIcon,
  Star,
  Search,
  Settings,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { useGetAdminDashboardStatsQuery } from '@/features/api/apiSlice';
import type { AdminDashboardStats } from '@/types/admin';

type DashboardNavItem = {
  href: string;
  icon: ReactNode;
  title: string;
  countKey?: keyof AdminDashboardStats;
};

type DashboardSection = {
  title: string;
  description?: string;
  items: DashboardNavItem[];
};

export function AdminDashboard() {
  const t = useTranslations('admin.dashboard');
  const { data: stats } = useGetAdminDashboardStatsQuery();

  const items = {
    packages: {
      href: '/admin/packages',
      icon: <Boxes className="size-8 text-primary" aria-hidden />,
      title: t('cards.packages.title'),
      countKey: 'packages',
    },
    provinces: {
      href: '/admin/provinces',
      icon: <Map className="size-8 text-primary" aria-hidden />,
      title: t('cards.provinces.title'),
      countKey: 'provinces',
    },
    cities: {
      href: '/admin/cities',
      icon: <Route className="size-8 text-primary" aria-hidden />,
      title: t('cards.cities.title'),
      countKey: 'cities',
    },
    districts: {
      href: '/admin/districts',
      icon: <MapPin className="size-8 text-primary" aria-hidden />,
      title: t('cards.districts.title'),
      countKey: 'districts',
    },
    divarCategories: {
      href: '/admin/divar-categories',
      icon: <GitBranch className="size-8 text-primary" aria-hidden />,
      title: t('cards.divarCategories.title'),
      countKey: 'divarCategories',
    },
    divarFilters: {
      href: '/admin/divar-filters',
      icon: <SlidersHorizontal className="size-8 text-primary" aria-hidden />,
      title: t('cards.divarFilters.title'),
      countKey: 'divarCategoryFilters',
    },
    divarReports: {
      href: '/admin/divar-reports',
      icon: <BarChart3 className="size-8 text-primary" aria-hidden />,
      title: t('cards.divarReports.title'),
    },
    postsToAnalyze: {
      href: '/admin/divar-posts',
      icon: <Newspaper className="size-8 text-primary" aria-hidden />,
      title: t('cards.postsToAnalyze.title'),
      countKey: 'postsToAnalyzePending',
    },
    news: {
      href: '/admin/news',
      icon: <ScrollText className="size-8 text-primary" aria-hidden />,
      title: t('cards.news.title'),
      countKey: 'news',
    },
    newsCategories: {
      href: '/admin/news/categories',
      icon: <ScrollText className="size-8 text-primary" aria-hidden />,
      title: t('cards.newsCategories.title'),
      countKey: 'newsCategories',
    },
    newsTags: {
      href: '/admin/news/tags',
      icon: <Tag className="size-8 text-primary" aria-hidden />,
      title: t('cards.newsTags.title'),
      countKey: 'newsTags',
    },
    newsSources: {
      href: '/admin/news/sources',
      icon: <Rss className="size-8 text-primary" aria-hidden />,
      title: t('cards.newsSources.title'),
      countKey: 'newsSources',
    },
    blog: {
      href: '/admin/blog',
      icon: <BookOpenText className="size-8 text-primary" aria-hidden />,
      title: t('cards.blog.title'),
      countKey: 'blog',
    },
    blogCategories: {
      href: '/admin/blog/categories',
      icon: <BookOpenText className="size-8 text-primary" aria-hidden />,
      title: t('cards.blogCategories.title'),
      countKey: 'blogCategories',
    },
    blogTags: {
      href: '/admin/blog/tags',
      icon: <Tag className="size-8 text-primary" aria-hidden />,
      title: t('cards.blogTags.title'),
      countKey: 'blogTags',
    },
    blogSources: {
      href: '/admin/blog/sources',
      icon: <Rss className="size-8 text-primary" aria-hidden />,
      title: t('cards.blogSources.title'),
      countKey: 'blogSources',
    },
    slides: {
      href: '/admin/slides',
      icon: <ImageIcon className="size-8 text-primary" aria-hidden />,
      title: t('cards.slides.title'),
      countKey: 'slides',
    },
    featuredPosts: {
      href: '/admin/featured-posts',
      icon: <Star className="size-8 text-primary" aria-hidden />,
      title: t('cards.featuredPosts.title'),
      countKey: 'featuredPosts',
    },
    seoSettings: {
      href: '/admin/seo',
      icon: <Search className="size-8 text-primary" aria-hidden />,
      title: t('cards.seoSettings.title'),
      countKey: 'seoSettings',
    },
    websiteSettings: {
      href: '/admin/website-settings',
      icon: <Settings className="size-8 text-primary" aria-hidden />,
      title: t('cards.websiteSettings.title'),
      countKey: 'websiteSettings',
    },
    notifications: {
      href: '/admin/notifications',
      icon: <Bell className="size-8 text-primary" aria-hidden />,
      title: t('cards.notifications.title'),
      countKey: 'notifications',
    },
    divarSessions: {
      href: '/admin/divar-sessions',
      icon: <KeyRound className="size-8 text-primary" aria-hidden />,
      title: t('cards.divarSessions.title'),
      countKey: 'adminDivarSessions',
    },
    arkaSessions: {
      href: '/admin/arka-sessions',
      icon: <KeyRound className="size-8 text-primary" aria-hidden />,
      title: t('cards.arkaSessions.title'),
      countKey: 'adminArkaSessions',
    },
  } satisfies Record<string, DashboardNavItem>;

  const sections: DashboardSection[] = [
    {
      title: t('sections.content.title'),
      description: t('sections.content.description'),
      items: [
        items.news,
        items.newsCategories,
        items.newsTags,
        items.newsSources,
        items.blog,
        items.blogCategories,
        items.blogTags,
        items.blogSources,
        items.slides,
        items.featuredPosts,
        items.seoSettings,
        items.websiteSettings,
      ],
    },
    {
      title: t('sections.core.title'),
      description: t('sections.core.description'),
      items: [items.packages],
    },
    {
      title: t('sections.locations.title'),
      description: t('sections.locations.description'),
      items: [items.provinces, items.cities, items.districts],
    },
    {
      title: t('sections.divar.title'),
      description: t('sections.divar.description'),
      items: [
        items.divarCategories,
        items.divarFilters,
        items.divarReports,
        items.postsToAnalyze,
        items.divarSessions,
      ],
    },
    {
      title: t('sections.integrations.title'),
      description: t('sections.integrations.description'),
      items: [items.notifications, items.arkaSessions],
    },
  ];

  return (
    <div className="flex w-full flex-col gap-10 px-4 py-8 md:py-12">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t('description')}</p>
      </div>

      <div className="flex flex-col gap-10">
        {sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              {section.description && (
                <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {section.items.map((item) => {
                const count = item.countKey ? stats?.[item.countKey] : undefined;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="bg-card group relative h-full rounded-xl border border-border/60 p-4 transition hover:border-primary/70 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {item.icon}
                      </div>
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    </div>
                    {typeof count === 'number' && (
                      <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        {count.toLocaleString()}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
