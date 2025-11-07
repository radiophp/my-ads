'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useGetDivarCategoriesQuery } from '@/features/api/apiSlice';
import { cn } from '@/lib/utils';

export function AdminDivarCategoriesManager() {
  const t = useTranslations('admin.divarCategories');
  const {
    data: categories = [],
    isLoading,
    isFetching,
  } = useGetDivarCategoriesQuery();

  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) {
      return categories;
    }
    return categories.filter((category) =>
      `${category.name} ${category.displayPath}`.toLowerCase().includes(normalizedSearch),
    );
  }, [categories, normalizedSearch]);

  const isBusy = isLoading || isFetching;
  const activeCount = categories.filter((category) => category.isActive).length;
  const hasSearch = normalizedSearch.length > 0;

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="gap-4">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t('stats', {
                total: categories.length,
                active: activeCount,
              })}
            </p>
            <label className="flex flex-col gap-1 text-sm text-muted-foreground sm:min-w-[16rem]">
              <span className="font-medium text-foreground">{t('search.label')}</span>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('search.placeholder')}
                autoComplete="off"
              />
            </label>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left">
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.name')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.slug')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.parent')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.path')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.depth')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.children')}
                </th>
                <th className="py-3 font-medium text-muted-foreground">
                  {t('columns.status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isBusy ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    {hasSearch ? t('search.empty') : t('empty')}
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category) => (
                  <tr key={category.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="flex flex-col">
                        <span
                          className="font-medium text-foreground"
                          style={{ paddingLeft: `${category.depth * 12}px` }}
                        >
                          {category.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {category.displayPath}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground sm:text-sm">
                      {category.slug}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">
                      {category.parentName ?? t('noParent')}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground sm:text-sm">
                      {category.path}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{category.depth}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {category.childrenCount}
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          category.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {category.isActive ? t('status.active') : t('status.inactive')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
