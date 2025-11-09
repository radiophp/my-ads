'use client';

import { useEffect, useMemo, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
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
  useGetDistrictsQuery,
  useGetProvincesQuery,
} from '@/features/api/apiSlice';

export function AdminDistrictsManager() {
  const t = useTranslations('admin.locations.districts');

  const { data: provinces = [] } = useGetProvincesQuery();
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | 'all'>('all');
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: cities = [],
    isLoading: citiesLoading,
    isFetching: citiesFetching,
  } = useGetCitiesQuery(selectedProvinceId === 'all' ? undefined : selectedProvinceId);

  useEffect(() => {
    if (
      selectedCityId !== null &&
      cities.length > 0 &&
      !cities.some((city) => city.id === selectedCityId)
    ) {
      setSelectedCityId(null);
    }
  }, [cities, selectedCityId]);

useEffect(() => {
  setSearchTerm('');
}, [selectedCityId]);

  const {
    data: districts = [],
    isLoading: districtsLoading,
    isFetching: districtsFetching,
  } = useGetDistrictsQuery(selectedCityId === null ? skipToken : selectedCityId);

  const isBusy = districtsLoading || districtsFetching;
  const isLoadingSelectors = citiesLoading || citiesFetching;
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const cityLookup = useMemo(() => {
    const map = new Map<number, { name: string; province: string }>();
    cities.forEach((city) => {
      map.set(city.id, { name: city.name, province: city.province });
    });
    return map;
  }, [cities]);

  const filteredDistricts = useMemo(() => {
    if (!normalizedSearch) {
      return districts;
    }
    return districts.filter((district) =>
      district.name.toLowerCase().includes(normalizedSearch),
    );
  }, [districts, normalizedSearch]);
  const hasSearch = normalizedSearch.length > 0;

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-4">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
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
                <option value="all">{t('filters.allProvinces')}</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t('filters.city')}</span>
              <select
                value={selectedCityId === null ? 'none' : String(selectedCityId)}
                onChange={(event) => {
                  const next = event.target.value;
                  setSelectedCityId(next === 'none' ? null : Number(next));
                }}
                className="min-w-48 rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={isLoadingSelectors || cities.length === 0}
              >
                <option value="none">{t('filters.selectCity')}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
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
                disabled={selectedCityId === null}
                autoComplete="off"
              />
            </label>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {selectedCityId === null ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {isLoadingSelectors ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  <span>{t('loadingCities')}</span>
                </div>
              ) : (
                t('selectCityPlaceholder')
              )}
            </div>
          ) : (
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
                    {t('columns.city')}
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted-foreground">
                    {t('columns.province')}
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
                ) : filteredDistricts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground">
                      {hasSearch ? t('search.empty') : t('empty')}
                    </td>
                  </tr>
                ) : (
                  filteredDistricts.map((district) => {
                    const lookup = cityLookup.get(district.cityId);
                    return (
                      <tr key={district.id} className="border-b border-border/60 last:border-b-0">
                        <td className="py-3 pr-4 text-muted-foreground">{district.id}</td>
                        <td className="py-3 pr-4 font-medium text-foreground">
                          {district.name}
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground sm:text-sm">
                          {district.slug}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{lookup?.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{lookup?.province}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
