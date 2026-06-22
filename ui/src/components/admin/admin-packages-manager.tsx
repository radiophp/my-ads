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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  useGetPackagesQuery,
  useUpdatePackageMutation,
} from '@/features/api/endpoints/packages';
import { Link } from '@/i18n/routing';
import type { SubscriptionPackage } from '@/types/packages';
import { PACKAGE_FEATURES } from '@/components/admin/constants/package-features.constants';

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

const FEATURE_KEYS = Object.keys(PACKAGE_FEATURES);
const FIXED_COL_COUNT = 5;
const TOTAL_COL_COUNT = FIXED_COL_COUNT + FEATURE_KEYS.length + 2;

export function AdminPackagesManager() {
  const t = useTranslations('admin.packages');
  const fl = useTranslations('admin.packages.form.capabilityLabels');
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
  const [showDeactivated, setShowDeactivated] = useState(false);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPackages = useMemo(() => {
    let list = packages;
    if (!showDeactivated) {
      list = list.filter((pkg) => pkg.isActive);
    }
    if (normalizedSearch) {
      list = list.filter((pkg) => {
        const haystack = `${pkg.title} ${pkg.description ?? ''}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }
    return list;
  }, [packages, normalizedSearch, showDeactivated]);
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
            <div className="flex items-end gap-4">
              <label className="flex flex-col gap-1 text-sm text-muted-foreground sm:max-w-xs">
                <span className="font-medium text-foreground">{t('table.searchLabel')}</span>
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('table.searchPlaceholder')}
                  autoComplete="off"
                />
              </label>
              <div className="flex items-center gap-2 pb-1">
                <Switch
                  id="show-deactivated"
                  checked={showDeactivated}
                  onCheckedChange={setShowDeactivated}
                />
                <Label htmlFor="show-deactivated" className="text-sm text-muted-foreground">
                  {t('table.showDeactivated')}
                </Label>
              </div>
            </div>
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
                <th className="min-w-[160px] whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.package')}
                </th>
                <th className="min-w-[120px] whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.duration')}
                </th>
                <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.users')}
                </th>
                <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.pricing')}
                </th>
                {Object.entries(PACKAGE_FEATURES).map(([key]) => (
                  <th
                    key={key}
                    className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground"
                  >
                    {fl(key)}
                  </th>
                ))}
                <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">
                  {t('table.columns.status')}
                </th>
                <th className="whitespace-nowrap py-3 text-right font-medium text-muted-foreground">
                  {t('table.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoadingPackages ? (
                <tr>
                  <td colSpan={TOTAL_COL_COUNT} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>{t('table.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPackages.length === 0 ? (
                <tr>
                  <td colSpan={TOTAL_COL_COUNT} className="py-10 text-center text-muted-foreground">
                    {hasSearch ? t('table.searchEmpty') : t('table.empty')}
                  </td>
                </tr>
              ) : (
                filteredPackages.map((pkg) => (
                  <tr key={pkg.id} className="border-b border-border/60 last:border-b-0">
                    <td className="whitespace-nowrap py-3 pr-4">
                      <div className="flex items-center gap-3">
                        {pkg.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pkg.imageUrl}
                            alt={pkg.title}
                            className="size-10 rounded-md border border-border/60 object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground">
                            <UserIconPlaceholder />
                          </div>
                        )}
                        <span className="font-medium text-foreground">{pkg.title}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4">
                      <span className="font-medium text-foreground">
                        {t('table.durationValue', { days: pkg.durationDays })}
                      </span>
                      {pkg.freeDays > 0 ? (
                        <span className="mr-1 text-xs text-emerald-600 dark:text-emerald-400">
                          +{t('table.freeDaysValue', { days: pkg.freeDays })}
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4">
                      <span className="font-medium text-foreground">{pkg.includedUsers}</span>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4">
                      <span className="font-medium text-foreground">
                        {formatPrice(pkg.discountedPrice, locale)}
                      </span>
                      <span className="mr-1 text-xs text-muted-foreground line-through">
                        {formatPrice(pkg.actualPrice, locale)}
                      </span>
                    </td>
                    {Object.entries(PACKAGE_FEATURES).map(([key, feature]) => (
                      <td key={key} className="whitespace-nowrap py-3 pr-4">
                        <span className="text-foreground">
                          {feature.type === 'BOOLEAN'
                            ? (pkg.features?.[key] === 'true' ? 'دارد' : 'ندارد')
                            : (pkg.features?.[key] ?? '')}
                        </span>
                      </td>
                    ))}
                    <td className="whitespace-nowrap py-3 pr-4">
                      <span
                        className={pkg.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}
                      >
                        {pkg.isActive ? t('table.active') : t('table.inactive')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-3 text-right">
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
