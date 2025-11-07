'use client';

import type { ReactNode } from 'react';
import { Boxes, GitBranch, Map, MapPin, Route } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link } from '@/i18n/routing';

type DashboardNavItem = {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
};

export function AdminDashboard() {
  const t = useTranslations('admin.dashboard');

  const items: DashboardNavItem[] = [
    {
      href: '/admin/packages',
      icon: <Boxes className="size-8 text-primary" aria-hidden />,
      title: t('cards.packages.title'),
      description: t('cards.packages.description'),
    },
    {
      href: '/admin/provinces',
      icon: <Map className="size-8 text-primary" aria-hidden />,
      title: t('cards.provinces.title'),
      description: t('cards.provinces.description'),
    },
    {
      href: '/admin/cities',
      icon: <Route className="size-8 text-primary" aria-hidden />,
      title: t('cards.cities.title'),
      description: t('cards.cities.description'),
    },
    {
      href: '/admin/districts',
      icon: <MapPin className="size-8 text-primary" aria-hidden />,
      title: t('cards.districts.title'),
      description: t('cards.districts.description'),
    },
    {
      href: '/admin/divar-categories',
      icon: <GitBranch className="size-8 text-primary" aria-hidden />,
      title: t('cards.divarCategories.title'),
      description: t('cards.divarCategories.description'),
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

      <div className="grid gap-6 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full border-border/70 transition-all group-hover:-translate-y-1 group-hover:border-primary/60 group-hover:shadow-lg">
              <CardHeader>
                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
                  {item.icon}
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary transition group-hover:underline">
                  {t('cards.cta')}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
