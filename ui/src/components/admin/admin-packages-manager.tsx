'use client';

import { useCallback, useMemo, useState } from 'react';
import { Loader2, PencilLine, Plus, UserRound } from 'lucide-react';
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
  useGetPackagesQuery,
  useUpdatePackageMutation,
} from '@/features/api/apiSlice';
import { Link } from '@/i18n/routing';
import type { SubscriptionPackage } from '@/types/packages';

const formatPrice = (value: string, locale: string): string => {
  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric)) {
    return value;
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);
};

export function AdminPackagesManager() {
  const t = useTranslations('admin.packages');
  const locale = useLocale();
  const { toast } = useToast();

  const {
    data: packages = [],
    isFetching,
    isLoading,
  } = useGetPackagesQuery();
  const [updatePackage] = useUpdatePackageMutation();

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPackages = useMemo(() => {
    if (!normalizedSearch) {
      return packages;
    }
    return packages.filter((pkg) => {
      const haystack = `${pkg.title} ${pkg.description ?? ''}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [packages, normalizedSearch]);
  const hasSearch = normalizedSearch.length > 0;

  const handleToggleStatus = useCallback(
    async (pkg: SubscriptionPackage) => {
      const nextStatus = !pkg.isActive;
      try {
        setTogglingId(pkg.id);
        await updatePackage({ id: pkg.id, body: { isActive: nextStatus } }).unwrap();
        toast({
          title: t('toast.updatedTitle'),
          description: t('toast.updatedDescription'),
        });
      } catch (error) {
        console.error('Failed to toggle subscription package status', error);
        toast({
          title: t('toast.errorTitle'),
          description: t('toast.errorDescription'),
          variant: 'destructive',
        });
      } finally {
        setTogglingId(null);
      }
    },
    [t, toast, updatePackage],
  );

  const isLoadingPackages = isLoading || isFetching;

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
              <Link href="/admin/packages/new">
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
                  {t('table.columns.package')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.duration')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.users')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.pricing')}
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
              {isLoadingPackages ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>{t('table.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    {hasSearch ? t('table.searchEmpty') : t('table.empty')}
                  </td>
                </tr>
              ) : (
                filteredPackages.map((pkg) => (
                  <tr key={pkg.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-start gap-3">
                        {pkg.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pkg.imageUrl}
                            alt={pkg.title}
                            className="mt-0.5 size-12 rounded-md border border-border/60 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="mt-0.5 flex size-12 items-center justify-center rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground">
                            <UserIconPlaceholder />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{pkg.title}</span>
                          {pkg.description ? (
                            <span className="line-clamp-2 text-xs text-muted-foreground">
                              {pkg.description}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">
                          {t('table.durationValue', { days: pkg.durationDays })}
                        </span>
                        {pkg.freeDays > 0 ? (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">
                            {t('table.freeDaysValue', { days: pkg.freeDays })}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-medium text-foreground">{pkg.includedUsers}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">
                          {formatPrice(pkg.discountedPrice, locale)}
                        </span>
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(pkg.actualPrice, locale)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={pkg.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}
                      >
                        {pkg.isActive ? t('table.active') : t('table.inactive')}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/packages/${pkg.id}`}>
                            <PencilLine className="mr-1.5 size-4" aria-hidden />
                            {t('table.actions.edit')}
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant={pkg.isActive ? 'outline' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleStatus(pkg)}
                          disabled={togglingId === pkg.id}
                        >
                          {togglingId === pkg.id ? (
                            <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
                          ) : null}
                          {pkg.isActive
                            ? t('table.actions.deactivate')
                            : t('table.actions.activate')}
                        </Button>
                      </div>
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

function UserIconPlaceholder() {
  return <UserRound className="size-6 text-muted-foreground" aria-hidden />;
}
