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
import {
  useGetCitiesQuery,
  useGetProvincesQuery,
  useUpdateCityAllowPostingMutation,
} from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';

export function AdminCitiesManager() {
  const t = useTranslations('admin.locations.cities');
  const { data: provinces = [] } = useGetProvincesQuery();

  const [selectedProvinceId, setSelectedProvinceId] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: cities = [],
    isLoading,
    isFetching,
  } = useGetCitiesQuery(selectedProvinceId === 'all' ? undefined : selectedProvinceId);
  const [updateCityAllowPosting] = useUpdateCityAllowPostingMutation();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredCities = useMemo(() => {
    if (!normalizedSearch) {
      return cities;
    }
    return cities.filter((city) => city.name.toLowerCase().includes(normalizedSearch));
  }, [cities, normalizedSearch]);

  const isBusy = isLoading || isFetching;
  const hasSearch = normalizedSearch.length > 0;

  const provinceLookup = useMemo(() => {
    const map = new Map<number, string>();
    provinces.forEach((province) => {
      map.set(province.id, province.name);
    });
    return map;
  }, [provinces]);

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-end">
            <label className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t('filters.province')}</span>
              <select
                value={selectedProvinceId === 'all' ? 'all' : String(selectedProvinceId)}
                onChange={(event) => {
                  const next = event.target.value;
                  setSelectedProvinceId(next === 'all' ? 'all' : Number(next));
                }}
                className="min-w-48 rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">{t('filters.all')}</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-muted-foreground sm:min-w-56">
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
              <tr className="border-b border-border/70 text-left rtl:text-right">
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.id')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.name')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.slug')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.province')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.allowPosting')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isBusy ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    {hasSearch ? t('search.empty') : t('empty')}
                  </td>
                </tr>
              ) : (
                filteredCities.map((city) => (
                  <tr key={city.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-3 pr-4 text-muted-foreground">{city.id}</td>
                    <td className="py-3 pr-4 font-medium text-foreground">{city.name}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground sm:text-sm">
                      {city.slug}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {provinceLookup.get(city.provinceId)}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant={city.allowPosting ? 'default' : 'outline'}
                        disabled={updatingId === city.id}
                        onClick={async () => {
                          try {
                            setUpdatingId(city.id);
                            await updateCityAllowPosting({
                              id: city.id,
                              allowPosting: !city.allowPosting,
                            }).unwrap();
                          } finally {
                            setUpdatingId(null);
                          }
                        }}
                      >
                        {updatingId === city.id ? (
                          <Loader2 className="size-3 animate-spin" aria-hidden />
                        ) : city.allowPosting ? (
                          t('allowPosting.enabled')
                        ) : (
                          t('allowPosting.disabled')
                        )}
                      </Button>
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
