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
import { useGetProvincesQuery } from '@/features/api/apiSlice';

export function AdminProvincesManager() {
  const t = useTranslations('admin.locations.provinces');
  const { data: provinces = [], isLoading, isFetching } = useGetProvincesQuery();

  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredProvinces = useMemo(() => {
    if (!normalizedSearch) {
      return provinces;
    }
    return provinces.filter((province) =>
      province.name.toLowerCase().includes(normalizedSearch),
    );
  }, [provinces, normalizedSearch]);

  const isBusy = isLoading || isFetching;
  const hasSearch = normalizedSearch.length > 0;

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <label className="flex w-full flex-col gap-1 text-sm text-muted-foreground sm:max-w-xs">
            <span className="font-medium text-foreground">{t('search.label')}</span>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('search.placeholder')}
              autoComplete="off"
            />
          </label>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left">
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.id')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.name')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.slug')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isBusy ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProvinces.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-muted-foreground">
                    {hasSearch ? t('search.empty') : t('empty')}
                  </td>
                </tr>
              ) : (
                filteredProvinces.map((province) => (
                  <tr key={province.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-3 pr-4 text-muted-foreground">{province.id}</td>
                    <td className="py-3 pr-4 font-medium text-foreground">{province.name}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground sm:text-sm">
                      {province.slug}
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
