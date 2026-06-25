'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  DollarSign,
  Loader2,
  PencilLine,
  Plus,
  UserRound,
  Users,
} from 'lucide-react';
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
import type {
  SubscriptionPackage,
  PackagePriceSnapshot,
} from '@/types/packages';
import { PACKAGE_FEATURES } from '@/components/admin/constants/package-features.constants';
import { getPackageFeatureIcon } from '@/components/shared/package-feature-icons';
import type { PackageFeatureKey } from '@/components/admin/constants/package-features.constants';

const formatPrice = (value: string, locale: string): string => {
  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric)) return value;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numeric);
};

interface SnapshotSummary {
  subDaily: number;
  subTotal: number;
  oneTime: number;
  grandTotal: number;
}

function computeSnapshotSummary(
  snapshots: PackagePriceSnapshot[] | undefined,
  durationDays: number,
): SnapshotSummary | null {
  if (!snapshots || snapshots.length === 0) return null;
  let subDaily = 0;
  let oneTime = 0;
  for (const s of snapshots) {
    if (s.isPermanent) {
      oneTime += Number(s.oneTimeTotal);
    } else {
      subDaily += Number(s.dailyTotal);
    }
  }
  const subTotal = subDaily * durationDays;
  const grandTotal = subTotal + oneTime;
  return { subDaily, subTotal, oneTime, grandTotal };
}

function PackageCard({
  pkg,
  fl,
  locale,
  togglingId,
  onToggle,
  t,
}: {
  pkg: SubscriptionPackage;
  fl: (key: string) => string;
  locale: string;
  togglingId: string | null;
  onToggle: (pkg: SubscriptionPackage) => void;
  t: (key: string, vars?: Record<string, string | number | Date>) => string;
}) {
  const snapSummary = computeSnapshotSummary(
    pkg.priceSnapshots,
    pkg.durationDays,
  );

  const isActive = pkg.isActive;

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {pkg.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pkg.imageUrl}
                alt={pkg.title}
                className="size-12 shrink-0 rounded-lg border border-border/60 object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            ) : (
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 text-muted-foreground">
                <UserRound className="size-6" aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className="text-lg">{pkg.title}</CardTitle>
              {pkg.description && (
                <CardDescription className="line-clamp-1">
                  {pkg.description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={
                `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ` +
                (isActive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground')
              }
            >
              <span
                className={
                  `size-1.5 rounded-full ` +
                  (isActive ? 'bg-emerald-500' : 'bg-muted-foreground')
                }
              />
              {isActive ? t('table.active') : t('table.inactive')}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/packages/${pkg.id}`}>
              <PencilLine className="size-3.5" aria-hidden />
              {t('table.actions.edit')}
            </Link>
          </Button>
          <Button
            type="button"
            variant={isActive ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => onToggle(pkg)}
            disabled={togglingId === pkg.id}
          >
            {togglingId === pkg.id ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : null}
            {isActive
              ? t('table.actions.deactivate')
              : t('table.actions.activate')}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Basic Info */}
        <Section title={t('form.capabilities.title')}>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <InfoItem
              label={t('form.fields.durationDays')}
              value={t('table.durationValue', { days: pkg.durationDays })}
            />
            {pkg.freeDays > 0 && (
              <InfoItem
                label={t('form.fields.freeDays')}
                value={`+${t('table.freeDaysValue', { days: pkg.freeDays })}`}
                className="text-emerald-600 dark:text-emerald-400"
              />
            )}
            <InfoItem
              label={t('form.fields.includedUsers')}
              value={String(pkg.includedUsers)}
            />
            <div>
              <span className="text-xs text-muted-foreground">
                {t('table.columns.pricing')}
              </span>
              <div className="mt-0.5 font-medium text-foreground">
                {formatPrice(pkg.discountedPrice, locale)}
                {Number(pkg.actualPrice) > Number(pkg.discountedPrice) && (
                  <span className="mr-1.5 text-xs text-muted-foreground line-through">
                    {formatPrice(pkg.actualPrice, locale)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Subscription Stats */}
        {pkg.stats && (
          <>
            <Divider />
            <Section title={t('cards.subscriptionStats')}>
              <div className="flex flex-wrap gap-4 text-sm">
                <StatBadge
                  label={t('cards.activeSubs')}
                  value={pkg.stats.subscriptionCounts['ACTIVE'] ?? 0}
                  className="text-emerald-600 dark:text-emerald-400"
                />
                <StatBadge
                  label={t('cards.expiredSubs')}
                  value={pkg.stats.subscriptionCounts['EXPIRED'] ?? 0}
                  className="text-amber-600 dark:text-amber-400"
                />
                <StatBadge
                  label={t('cards.canceledSubs')}
                  value={pkg.stats.subscriptionCounts['CANCELED'] ?? 0}
                  className="text-muted-foreground"
                />
              </div>
            </Section>
          </>
        )}

        {/* Payment Stats */}
        {pkg.stats && (
          <>
            <Divider />
            <Section title={t('cards.paymentStats')}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                <StatBadge
                  label={t('cards.paymentApproved')}
                  value={pkg.stats.paymentCounts['APPROVED'] ?? 0}
                  className="text-emerald-600 dark:text-emerald-400"
                />
                <StatBadge
                  label={t('cards.paymentPending')}
                  value={pkg.stats.paymentCounts['PENDING'] ?? 0}
                  className="text-amber-600 dark:text-amber-400"
                />
                <StatBadge
                  label={t('cards.paymentInitiated')}
                  value={pkg.stats.paymentCounts['INITIATED'] ?? 0}
                  className="text-blue-600 dark:text-blue-400"
                />
                <StatBadge
                  label={t('cards.paymentRejected')}
                  value={pkg.stats.paymentCounts['REJECTED'] ?? 0}
                  className="text-red-600 dark:text-red-400"
                />
                <StatBadge
                  label={t('cards.paymentCancelled')}
                  value={pkg.stats.paymentCounts['CANCELLED'] ?? 0}
                  className="text-muted-foreground"
                />
                {Number(pkg.stats.totalRevenue) > 0 && (
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <DollarSign className="size-3.5 text-muted-foreground" aria-hidden />
                    {t('cards.totalRevenue')}:{' '}
                    {formatPrice(pkg.stats.totalRevenue, locale)}
                  </span>
                )}
              </div>
            </Section>
          </>
        )}

        {/* Feature Configs */}
        {pkg.featureConfigs && pkg.featureConfigs.length > 0 && (
          <>
            <Divider />
            <Section title={t('cards.featureConfigs')}>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {pkg.featureConfigs.map((cfg) => {
                  const feature = PACKAGE_FEATURES[cfg.featureKey as PackageFeatureKey];
                  const Icon = getPackageFeatureIcon(
                    cfg.featureKey as PackageFeatureKey,
                  );
                  if (!feature) return null;
                  const isBool = feature.type === 'BOOLEAN';
                  const extras: string[] = [];
                  if (cfg.allowExtra && cfg.maxExtra > 0) {
                    let extraText = `${t('cards.allowExtra')}: ${cfg.maxExtra}`;
                    if (cfg.extraUnitPrice && Number(cfg.extraUnitPrice) > 0) {
                      extraText += ` (${formatPrice(cfg.extraUnitPrice, locale)})`;
                    }
                    extras.push(extraText);
                  }
                  if (cfg.allowRollover) {
                    let rollText = t('cards.allowRollover');
                    if (cfg.maxRolloverCap > 0) {
                      rollText += ` (${t('cards.rolloverCap')}: ${cfg.maxRolloverCap})`;
                    }
                    extras.push(rollText);
                  }
                  return (
                    <div
                      key={cfg.id}
                      className="flex items-start gap-2 rounded-md border border-border/50 px-3 py-2"
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground">
                          {fl(cfg.featureKey)}
                        </span>
                        <span className="mr-1 text-sm text-foreground">
                          {isBool
                            ? cfg.limitValue > 0
                              ? t('table.active')
                              : t('table.inactive')
                            : cfg.limitValue}
                        </span>
                        {extras.length > 0 && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {extras.join(' | ')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          </>
        )}

        {/* Price Snapshots */}
        {pkg.priceSnapshots && pkg.priceSnapshots.length > 0 ? (
          <>
            <Divider />
            <Section title={t('cards.priceSnapshots')}>
              <div className="space-y-2">
                {pkg.priceSnapshots.map((snap) => {
                  const Icon = getPackageFeatureIcon(
                    snap.featureKey as PackageFeatureKey,
                  );
                  const perUnit = formatPrice(snap.unitPrice, locale);
                  const daily = formatPrice(snap.dailyTotal, locale);
                  const oneTime = formatPrice(snap.oneTimeTotal, locale);
                  return (
                    <div
                      key={snap.id}
                      className="flex items-start gap-2 rounded-md border border-border/50 px-3 py-2"
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                        <span className="text-sm font-medium text-foreground">
                          {fl(snap.featureKey)}
                          {snap.isPermanent && (
                            <span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              {t('cards.permanent')}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          <span className="ml-1">{perUnit}</span>
                          {snap.isPermanent
                            ? `${t('cards.oneTimeTotal')}: ${oneTime}`
                            : `${daily} ${t('cards.subscriptionDaily')}`}
                          {snap.allowRollover && (
                            <span className="mr-2 text-[10px] text-blue-500">
                              {t('cards.allowRollover')}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {snapSummary && (
                <div className="mt-3 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
                    <span className="text-muted-foreground">
                      {t('cards.subscriptionDaily')}:{' '}
                      <b className="text-foreground">
                        {formatPrice(String(snapSummary.subDaily), locale)}
                      </b>
                    </span>
                    <span className="text-muted-foreground">
                      {t('cards.subscriptionTotal')}:{' '}
                      <b className="text-foreground">
                        {formatPrice(String(snapSummary.subTotal), locale)}
                      </b>
                    </span>
                    {snapSummary.oneTime > 0 && (
                      <span className="text-muted-foreground">
                        {t('cards.oneTimeTotal')}:{' '}
                        <b className="text-foreground">
                          {formatPrice(String(snapSummary.oneTime), locale)}
                        </b>
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {t('cards.grandTotal')}:{' '}
                      <b className="text-lg text-foreground">
                        {formatPrice(String(snapSummary.grandTotal), locale)}
                      </b>
                    </span>
                  </div>
                </div>
              )}
            </Section>
          </>
        ) : (
          <>
            <Divider />
            <Section title={t('cards.priceSnapshots')}>
              <p className="text-sm text-muted-foreground">
                {t('cards.noSnapshots')}
              </p>
            </Section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div className="h-px bg-border/60" />
  );
}

function InfoItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className={'mt-0.5 font-medium text-foreground ' + (className ?? '')}>
        {value}
      </div>
    </div>
  );
}

function StatBadge({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <span className={'flex items-center gap-1 ' + (className ?? '')}>
      <Users className="size-3.5" aria-hidden />
      <span>{label}:</span>
      <b>{value}</b>
    </span>
  );
}

export function AdminPackagesManager() {
  const t = useTranslations('admin.packages');
  const fl = useTranslations('admin.packages.form.capabilityFormLabels');
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
      </Card>

      {isLoadingPackages ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          <span>{t('table.loading')}</span>
        </div>
      ) : filteredPackages.length === 0 ? (
        <Card className="border-border/70">
          <CardContent className="py-10 text-center text-muted-foreground">
            {hasSearch ? t('table.searchEmpty') : t('table.empty')}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              fl={fl}
              locale={locale}
              togglingId={togglingId}
              onToggle={handleToggleStatus}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
