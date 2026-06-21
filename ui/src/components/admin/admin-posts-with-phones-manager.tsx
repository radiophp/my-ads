'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useGetPostsWithPhonesQuery } from '@/features/api/endpoints/divar-posts';
import { useGetDivarCategoriesQuery } from '@/features/api/endpoints/divar-categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/routing';
import { LocationCascade } from '@/components/ui/location-cascade';
import { SearchableSelect } from '@/components/ui/searchable-select';

export function AdminPostsWithPhonesManager() {
  const t = useTranslations('admin.postsWithPhones');

  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(895);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [cat3Filter, setCat3Filter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('personal');
  const [phoneFilter, setPhoneFilter] = useState('all');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [phoneSearchError, setPhoneSearchError] = useState('');
  const [phoneSearchQuery, setPhoneSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data: categories = [] } = useGetDivarCategoriesQuery();

  const leafCategories = useMemo(
    () => categories.filter((c) => c.depth === 3 && c.isActive && c.allowPosting),
    [categories],
  );

  const cat3Options = useMemo(
    () => [
      { value: '', label: t('filters.all') },
      ...leafCategories.map((c) => ({
        value: c.slug,
        label: c.displayPath
          ? c.displayPath
              .split(' - ')
              .slice(-2)
              .join(' > ')
          : c.name,
      })),
    ],
    [leafCategories, t],
  );

  const queryParams = useMemo(() => ({
    page,
    pageSize: 20,
    provinceId: selectedProvinceId ?? undefined,
    cityId: selectedCityId ?? undefined,
    districtId: selectedDistrictId ?? undefined,
    cat3: cat3Filter || undefined,
    businessType: businessFilter !== 'all' ? businessFilter : undefined,
    phoneFilter: phoneFilter !== 'all' ? phoneFilter : undefined,
    phone: phoneSearchQuery || undefined,
  }), [page, selectedProvinceId, selectedCityId, selectedDistrictId, cat3Filter, businessFilter, phoneFilter, phoneSearchQuery]);

  const { data, isFetching, isLoading, refetch } = useGetPostsWithPhonesQuery(queryParams);

  const items = data?.items ?? [];
  const meta = data?.meta;

  const handleReset = () => {
    setSelectedProvinceId(895);
    setSelectedCityId(null);
    setSelectedDistrictId(null);
    setCat3Filter('');
    setBusinessFilter('personal');
    setPhoneFilter('all');
    setPhoneSearch('');
    setPhoneSearchError('');
    setPhoneSearchQuery('');
    setPage(1);
  };

  const persianToEnglish = (str: string) =>
    str.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
       .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  const handlePhoneSubmit = () => {
    const normalized = persianToEnglish(phoneSearch).replace(/\D/g, '');
    if (!normalized) {
      setPhoneSearchQuery('');
      setPhoneSearchError('');
      setPage(1);
      return;
    }
    if (/^09[0-9]{9}$/.test(normalized)) {
      setPhoneSearch(normalized);
      setPhoneSearchQuery(normalized);
      setPhoneSearchError('');
      setPage(1);
    } else {
      setPhoneSearchError(t('filters.phoneSearchError'));
    }
  };

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardContent className="pt-6">
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t('filters.location')}
            </label>
            <LocationCascade
              provinceId={selectedProvinceId}
              cityId={selectedCityId}
              districtId={selectedDistrictId}
              onProvinceChange={(id) => {
                setSelectedProvinceId(id);
                setPage(1);
              }}
              onCityChange={(id) => {
                setSelectedCityId(id);
                setPage(1);
              }}
              onDistrictChange={(id) => {
                setSelectedDistrictId(id);
                setPage(1);
              }}
              provincePlaceholder={t('filters.allProvinces')}
              cityPlaceholder={t('filters.allCities')}
              districtPlaceholder={t('filters.allDistricts')}
              provinceSearchPlaceholder={t('filters.provinceSearch')}
              citySearchPlaceholder={t('filters.citySearch')}
              districtSearchPlaceholder={t('filters.districtSearch')}
              allText={t('filters.all')}
            />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="col-span-full flex flex-col gap-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t('filters.cat3')}
              </label>
              <SearchableSelect
                options={cat3Options}
                value={cat3Filter}
                onSelect={(val) => {
                  setCat3Filter(val);
                  setPage(1);
                }}
                placeholder={t('filters.cat3Placeholder')}
                searchPlaceholder={t('filters.cat3Search')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('filters.businessType')}
              </label>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={businessFilter}
                onChange={(e) => {
                  setBusinessFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">{t('filters.all')}</option>
                <option value="personal">{t('filters.personal')}</option>
                <option value="business">{t('filters.business')}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('filters.phoneFilter')}
              </label>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={phoneFilter}
                onChange={(e) => {
                  setPhoneFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">{t('filters.all')}</option>
                <option value="has">{t('filters.hasPhone')}</option>
                <option value="none">{t('filters.noPhone')}</option>
              </select>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-0">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('filters.phoneSearch')}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    className="h-9"
                    placeholder={t('filters.phoneSearchPlaceholder')}
                    value={phoneSearch}
                    onChange={(e) => {
                      setPhoneSearch(e.target.value);
                      setPhoneSearchError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handlePhoneSubmit();
                    }}
                  />
                  {phoneSearchError && (
                    <span className="absolute -bottom-5 left-0 text-xs text-destructive">
                      {phoneSearchError}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="h-9"
                  onClick={handlePhoneSubmit}
                >
                  <Search className="ml-1 size-4" />
                  {t('filters.phoneSearchButton')}
                </Button>
              </div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:flex">
            <Button variant="outline" size="sm" onClick={handleReset}>
              {t('actions.reset')}
            </Button>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="ml-1 size-4" />
              {t('actions.refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="overflow-x-auto pt-6">
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">{t('empty')}</div>
          ) : (
            <>
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left rtl:text-right">
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      {t('columns.code')}
                    </th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      {t('columns.externalId')}
                    </th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      {t('columns.title')}
                    </th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      {t('columns.category')}
                    </th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      {t('columns.location')}
                    </th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      {t('columns.publishedAt')}
                    </th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      {t('columns.contactPhone')}
                    </th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      {t('columns.arkaPhone')}
                    </th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                      {t('columns.melkradarPhone')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/60 last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap py-3 pr-4">
                        <Link
                          href={`/dashboard/posts/${item.id}`}
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          {item.code}
                          <ExternalLink className="size-3" />
                        </Link>
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4">
                        <a
                          href={`https://divar.ir/v/${item.externalId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary hover:underline"
                        >
                          {item.externalId.slice(0, 12)}...
                          <ExternalLink className="size-3" />
                        </a>
                      </td>
                      <td className="max-w-xs truncate py-3 pr-4 text-foreground">
                        {item.title ?? '—'}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                        {item.cat3 ?? '—'}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                        {[item.provinceName, item.cityName, item.districtName]
                          .filter(Boolean)
                          .join(' / ') || '—'}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                        {item.publishedAt
                          ? new Date(item.publishedAt).toLocaleString('fa-IR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 font-medium text-foreground">
                        {item.contactPhone ?? '—'}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-foreground">
                        {item.arkaPhone && item.arkaPhone !== '09000000000' ? item.arkaPhone : '—'}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-foreground">
                        {item.melkradarPhone ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {meta && meta.totalPages > 1 && (
                <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p className="text-sm text-muted-foreground">
                    {t('pagination.label', {
                      page: meta.page,
                      totalPages: meta.totalPages,
                      totalItems: meta.totalItems,
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!meta.hasPreviousPage}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {t('pagination.previous')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!meta.hasNextPage}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t('pagination.next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
