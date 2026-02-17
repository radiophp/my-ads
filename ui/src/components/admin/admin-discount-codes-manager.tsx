'use client';

import { useCallback, useMemo, useState } from 'react';
import { Loader2, PencilLine, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  useGetDiscountCodesQuery,
  useGetPackagesQuery,
  useUpdateDiscountCodeMutation,
} from '@/features/api/apiSlice';
import { Link } from '@/i18n/routing';
import type { DiscountCode } from '@/types/discount-codes';

const formatValue = (value: string, locale: string): string => {
  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric)) {
    return value;
  }
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);
};

export function AdminDiscountCodesManager() {
  const t = useTranslations('admin.discountCodes');
  const locale = useLocale();
  const { toast } = useToast();

  const {
    data: codes = [],
    isFetching,
    isLoading,
  } = useGetDiscountCodesQuery();
  const { data: packages = [] } = useGetPackagesQuery();
  const [updateDiscountCode] = useUpdateDiscountCodeMutation();

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const packageMap = useMemo(() => {
    return new Map(packages.map((pkg) => [pkg.id, pkg.title]));
  }, [packages]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredCodes = useMemo(() => {
    if (!normalizedSearch) {
      return codes;
    }

    return codes.filter((code) => {
      const packageLabel = code.packageId ? packageMap.get(code.packageId) ?? '' : '';
      const haystack = `${code.code} ${code.description ?? ''} ${packageLabel}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [codes, normalizedSearch, packageMap]);

  const hasSearch = normalizedSearch.length > 0;
  const isLoadingCodes = isLoading || isFetching;

  const formatDate = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(locale).format(date);
  };

  const handleToggleStatus = useCallback(
    async (code: DiscountCode) => {
      const nextStatus = !code.isActive;
      try {
        setTogglingId(code.id);
        await updateDiscountCode({ id: code.id, body: { isActive: nextStatus } }).unwrap();
        toast({
          title: t('toast.updatedTitle'),
          description: t('toast.updatedDescription'),
        });
      } catch (error) {
        console.error('Failed to toggle discount code status', error);
        toast({
          title: t('toast.errorTitle'),
          description: t('toast.errorDescription'),
          variant: 'destructive',
        });
      } finally {
        setTogglingId(null);
      }
    },
    [t, toast, updateDiscountCode],
  );

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>{t('table.title')}</CardTitle>
            <CardDescription>{t('table.description')}</CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="flex flex-col gap-1 text-sm text-muted-foreground sm:max-w-xs">
              <span className="font-medium text-foreground">{t('table.searchLabel')}</span>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('table.searchPlaceholder')}
                autoComplete="off"
              />
            </label>
            <Button asChild>
              <Link href="/admin/discount-codes/new">
                <Plus className="mr-2 size-4" aria-hidden />
                {t('table.add')}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left rtl:text-right">
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.code')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.type')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.value')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.package')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.validity')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.status')}
                </th>
                <th className="py-3 text-right font-medium text-muted-foreground">
                  {t('table.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoadingCodes ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>{t('table.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    {hasSearch ? t('table.searchEmpty') : t('table.empty')}
                  </td>
                </tr>
              ) : (
                filteredCodes.map((code) => {
                  const packageLabel = code.packageId
                    ? packageMap.get(code.packageId) ?? code.packageId
                    : t('table.anyPackage');
                  const fromLabel = formatDate(code.validFrom);
                  const toLabel = formatDate(code.validTo);
                  const validityLabel = fromLabel || toLabel
                    ? `${fromLabel ?? t('table.validityOpen')} -> ${
                        toLabel ?? t('table.validityOpen')
                      }`
                    : t('table.validityAny');
                  const valueLabel =
                    code.type === 'PERCENT'
                      ? `${formatValue(code.value, locale)}%`
                      : formatValue(code.value, locale);

                  return (
                    <tr key={code.id} className="border-b border-border/60 last:border-b-0">
                      <td className="py-3 pr-4 font-mono text-foreground">{code.code}</td>
                      <td className="py-3 pr-4">
                        {code.type === 'PERCENT'
                          ? t('table.types.percent')
                          : t('table.types.fixed')}
                      </td>
                      <td className="py-3 pr-4 font-medium text-foreground">{valueLabel}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{packageLabel}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{validityLabel}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={
                            code.isActive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-muted-foreground'
                          }
                        >
                          {code.isActive ? t('table.active') : t('table.inactive')}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/discount-codes/${code.id}`}>
                              <PencilLine className="mr-1.5 size-4" aria-hidden />
                              {t('table.actions.edit')}
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant={code.isActive ? 'outline' : 'secondary'}
                            size="sm"
                            onClick={() => handleToggleStatus(code)}
                            disabled={togglingId === code.id}
                          >
                            {togglingId === code.id ? (
                              <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
                            ) : null}
                            {code.isActive
                              ? t('table.actions.deactivate')
                              : t('table.actions.activate')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
