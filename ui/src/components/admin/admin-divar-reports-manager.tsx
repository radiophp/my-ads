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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  useGetDivarCategoriesQuery,
  useLazyGetDivarDistrictPriceReportQuery,
} from '@/features/api/apiSlice';
import type { DivarCategory } from '@/types/divar-category';

type CategoryType = 'rent' | 'sell' | 'unknown';

const resolveCategoryType = (category: DivarCategory | null): CategoryType => {
  if (!category) {
    return 'unknown';
  }
  const path = category.path ? category.path.split('/') : [];
  const candidates = new Set(
    [category.slug, ...path].map((value) => value.toLowerCase()),
  );
  if (Array.from(candidates).some((value) => value.includes('rent'))) {
    return 'rent';
  }
  if (Array.from(candidates).some((value) => value.includes('sell'))) {
    return 'sell';
  }
  return 'unknown';
};

const buildDateLabel = (value?: string | null): string => {
  if (!value) {
    return '--';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
};

export function AdminDivarReportsManager() {
  const t = useTranslations('admin.divarReports');
  const { toast } = useToast();
  const { data: categories = [], isLoading: isCategoriesLoading } =
    useGetDivarCategoriesQuery();
  const [fetchReport, { data: reportRows = [], isFetching, error }] =
    useLazyGetDivarDistrictPriceReportQuery();

  const [searchTerm, setSearchTerm] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minValue, setMinValue] = useState('10000000');
  const [maxValue, setMaxValue] = useState('');
  const [reportParams, setReportParams] = useState<{
    categorySlug: string;
    from: string;
    to: string;
    minValue: number;
    maxValue: number | null;
  } | null>(null);

  const leafCategories = useMemo(
    () =>
      categories
        .filter(
          (category) =>
            category.isActive && category.allowPosting && category.childrenCount === 0,
        )
        .sort((a, b) => a.displayPath.localeCompare(b.displayPath)),
    [categories],
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) {
      return leafCategories;
    }
    return leafCategories.filter((category) =>
      `${category.name} ${category.displayPath}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [leafCategories, normalizedSearch]);

  const activeCategorySlug = reportParams?.categorySlug ?? categorySlug;
  const activeCategory =
    categories.find((category) => category.slug === activeCategorySlug) ?? null;
  const categoryType = resolveCategoryType(activeCategory);

  const showSellMetrics = categoryType === 'sell' || categoryType === 'unknown';
  const showRentMetrics = categoryType === 'rent' || categoryType === 'unknown';

  const totalPosts = reportRows.reduce(
    (sum, row) => sum + (row.postCount ?? 0),
    0,
  );

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }),
    [],
  );

  const formatValue = (value: number | null) => {
    if (value === null || Number.isNaN(value)) {
      return '--';
    }
    return numberFormatter.format(Math.round(value));
  };

  const handleGenerate = () => {
    if (!categorySlug) {
      toast({
        title: t('errors.missingCategory'),
      });
      return;
    }
    if (!startDate || !endDate) {
      toast({
        title: t('errors.missingDates'),
      });
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: t('errors.invalidRange'),
      });
      return;
    }
    const minValueNumber = Number(minValue);
    if (!Number.isFinite(minValueNumber) || minValueNumber < 0) {
      toast({
        title: t('errors.invalidMinValue'),
      });
      return;
    }
    const maxValueTrimmed = maxValue.trim();
    const maxValueNumber =
      maxValueTrimmed.length > 0 ? Number(maxValueTrimmed) : null;
    if (
      maxValueNumber !== null &&
      (!Number.isFinite(maxValueNumber) || maxValueNumber < 0)
    ) {
      toast({
        title: t('errors.invalidMaxValue'),
      });
      return;
    }
    if (maxValueNumber !== null && maxValueNumber < minValueNumber) {
      toast({
        title: t('errors.invalidMaxRange'),
      });
      return;
    }

    const params = {
      categorySlug,
      from: startDate,
      to: endDate,
      minValue: Math.floor(minValueNumber),
      maxValue: maxValueNumber !== null ? Math.floor(maxValueNumber) : null,
    };
    setReportParams(params);
    fetchReport(params);
  };

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="gap-2">
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t('filters.search')}
              </span>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('filters.searchPlaceholder')}
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t('filters.category')}
              </span>
              <select
                className="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={categorySlug}
                onChange={(event) => setCategorySlug(event.target.value)}
                disabled={isCategoriesLoading}
              >
                <option value="">{t('filters.categoryPlaceholder')}</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.displayPath}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t('filters.startDate')}
              </span>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t('filters.endDate')}
              </span>
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t('filters.minValue')}
              </span>
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={minValue}
                onChange={(event) => setMinValue(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t('filters.maxValue')}
              </span>
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={maxValue}
                onChange={(event) => setMaxValue(event.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleGenerate} disabled={isFetching}>
              {isFetching ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {t('filters.loading')}
                </span>
              ) : (
                t('filters.submit')
              )}
            </Button>
            {reportParams ? (
              <div className="text-sm text-muted-foreground">
                {t('summary.category')}:{' '}
                <span className="font-medium text-foreground">
                  {activeCategory?.displayPath ?? activeCategorySlug}
                </span>{' '}
                | {t('summary.range')}:{' '}
                <span className="font-medium text-foreground">
                  {buildDateLabel(reportParams.from)} -{' '}
                  {buildDateLabel(reportParams.to)}
                </span>{' '}
                | {t('summary.districts')}:{' '}
                <span className="font-medium text-foreground">
                  {reportRows.length.toLocaleString()}
                </span>{' '}
                | {t('summary.posts')}:{' '}
                <span className="font-medium text-foreground">
                  {totalPosts.toLocaleString()}
                </span>
                {' '}
                | {t('summary.minValue')}:{' '}
                <span className="font-medium text-foreground">
                  {numberFormatter.format(reportParams.minValue)}
                </span>
                {reportParams.maxValue !== null ? (
                  <>
                    {' '}
                    | {t('summary.maxValue')}:{' '}
                    <span className="font-medium text-foreground">
                      {numberFormatter.format(reportParams.maxValue)}
                    </span>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
          {error ? (
            <p className="text-sm text-destructive">{t('errors.fetch')}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{t('table.title')}</CardTitle>
          <CardDescription>{t('table.description')}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isFetching ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>{t('filters.loading')}</span>
            </div>
          ) : reportRows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t('empty')}
            </div>
          ) : (
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left rtl:text-right">
                  <th
                    className="py-3 pr-4 font-medium text-muted-foreground"
                    rowSpan={2}
                  >
                    {t('table.district')}
                  </th>
                  <th
                    className="py-3 pr-4 font-medium text-muted-foreground"
                    rowSpan={2}
                  >
                    {t('table.posts')}
                  </th>
                  {showSellMetrics ? (
                    <>
                      <th
                        className="py-3 pr-4 font-medium text-muted-foreground"
                        colSpan={3}
                      >
                        {t('table.priceTotal')}
                      </th>
                      <th
                        className="py-3 pr-4 font-medium text-muted-foreground"
                        colSpan={3}
                      >
                        {t('table.pricePerSquare')}
                      </th>
                    </>
                  ) : null}
                  {showRentMetrics ? (
                    <>
                      <th
                        className="py-3 pr-4 font-medium text-muted-foreground"
                        colSpan={3}
                      >
                        {t('table.rentAmount')}
                      </th>
                      <th
                        className="py-3 pr-4 font-medium text-muted-foreground"
                        colSpan={3}
                      >
                        {t('table.depositAmount')}
                      </th>
                    </>
                  ) : null}
                </tr>
                <tr className="border-b border-border/70 text-left rtl:text-right">
                  {showSellMetrics ? (
                    <>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">
                        {t('table.min')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">
                        {t('table.avg')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">
                        {t('table.max')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">
                        {t('table.min')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">
                        {t('table.avg')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">
                        {t('table.max')}
                      </th>
                    </>
                  ) : null}
                  {showRentMetrics ? (
                    <>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">
                        {t('table.min')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">
                        {t('table.avg')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">
                        {t('table.max')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">
                        {t('table.min')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">
                        {t('table.avg')}
                      </th>
                      <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">
                        {t('table.max')}
                      </th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {reportRows.map((row) => (
                  <tr
                    key={row.districtId}
                    className="border-b border-border/60 text-left last:border-b-0 rtl:text-right"
                  >
                    <td className="py-3 pr-4 text-sm font-medium text-foreground">
                      {row.districtName}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">
                      {numberFormatter.format(row.postCount ?? 0)}
                    </td>
                    {showSellMetrics ? (
                      <>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {formatValue(row.minPriceTotal)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {formatValue(row.avgPriceTotal)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {formatValue(row.maxPriceTotal)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {formatValue(row.minPricePerSquare)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {formatValue(row.avgPricePerSquare)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {formatValue(row.maxPricePerSquare)}
                        </td>
                      </>
                    ) : null}
                    {showRentMetrics ? (
                      <>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {formatValue(row.minRentAmount)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {formatValue(row.avgRentAmount)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {formatValue(row.maxRentAmount)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {formatValue(row.minDepositAmount)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {formatValue(row.avgDepositAmount)}
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {formatValue(row.maxDepositAmount)}
                        </td>
                      </>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
