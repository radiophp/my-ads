'use client';

import type { ReactNode } from 'react';
import { Boxes, GitBranch, Map, MapPin, Route, SlidersHorizontal, Newspaper, Bell, KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { useGetAdminDashboardStatsQuery } from '@/features/api/apiSlice';
import type { AdminDashboardStats } from '@/types/admin';

type DashboardNavItem = {
  href: string;
  icon: ReactNode;
  title: string;
  countKey: keyof AdminDashboardStats;
};

export function AdminDashboard() {
  const t = useTranslations('admin.dashboard');
  const { data: stats } = useGetAdminDashboardStatsQuery();

  const items: DashboardNavItem[] = [
    {
      href: '/admin/packages',
      icon: <Boxes className="size-8 text-primary" aria-hidden />,
      title: t('cards.packages.title'),
      countKey: 'packages',
    },
    {
      href: '/admin/provinces',
      icon: <Map className="size-8 text-primary" aria-hidden />,
      title: t('cards.provinces.title'),
      countKey: 'provinces',
    },
    {
      href: '/admin/cities',
      icon: <Route className="size-8 text-primary" aria-hidden />,
      title: t('cards.cities.title'),
      countKey: 'cities',
    },
    {
      href: '/admin/districts',
      icon: <MapPin className="size-8 text-primary" aria-hidden />,
      title: t('cards.districts.title'),
      countKey: 'districts',
    },
    {
      href: '/admin/divar-categories',
      icon: <GitBranch className="size-8 text-primary" aria-hidden />,
      title: t('cards.divarCategories.title'),
      countKey: 'divarCategories',
    },
    {
      href: '/admin/divar-filters',
      icon: <SlidersHorizontal className="size-8 text-primary" aria-hidden />,
      title: t('cards.divarFilters.title'),
      countKey: 'divarCategoryFilters',
    },
    {
      href: '/admin/divar-posts',
      icon: <Newspaper className="size-8 text-primary" aria-hidden />,
      title: t('cards.postsToAnalyze.title'),
      countKey: 'postsToAnalyzePending',
    },
    {
      href: '/admin/notifications',
      icon: <Bell className="size-8 text-primary" aria-hidden />,
      title: t('cards.notifications.title'),
      countKey: 'notifications',
    },
    {
      href: '/admin/divar-sessions',
      icon: <KeyRound className="size-8 text-primary" aria-hidden />,
      title: t('cards.divarSessions.title'),
      countKey: 'adminDivarSessions',
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => {
          const count = stats?.[item.countKey];
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
    </div>
  );
}
