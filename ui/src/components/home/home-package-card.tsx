'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { PACKAGE_FEATURES } from '@/components/admin/constants/package-features.constants';
import { getPackageFeatureIcon } from '@/components/shared/package-feature-icons';
import type { SubscriptionPackage } from '@/types/packages';
import type { PackageFeatureKey } from '@/components/admin/constants/package-features.constants';

type HomePackageCardProps = {
  pkg: SubscriptionPackage;
  onActivate?: (pkg: SubscriptionPackage) => void;
};

export function HomePackageCard({ pkg, onActivate }: HomePackageCardProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('landing');
  const fl = useTranslations('admin.packages.form.capabilityLabels');
  const locale = useLocale();

  return (
    <>
      <div className="flex h-full flex-col rounded-lg border border-border/70 bg-card p-4 shadow-sm transition-shadow hover:shadow-md md:p-6">
        <div className="flex items-center gap-3">
          {pkg.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pkg.imageUrl}
              alt={pkg.title}
              className="size-14 shrink-0 rounded-lg border border-border/60 object-cover"
            />
          ) : null}
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{pkg.title}</h3>
            {pkg.isTrial ? (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {t('packages.trial')}
              </span>
            ) : null}
          </div>
          {pkg.description ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mr-auto shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={t('packages.moreInfo')}
            >
              <Info className="size-5" aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="mt-3 space-y-1 text-sm">
          <p className="font-semibold text-muted-foreground">{t('packages.duration', { days: pkg.durationDays })}</p>
          {Object.entries(PACKAGE_FEATURES).map(([key, feature]) => {
            const val = pkg.features?.[key];
            if (feature.type === 'BOOLEAN' && val !== 'true') return null;
            if (feature.type === 'NUMBER' && (!val || Number(val) <= 0)) return null;
            const Icon = getPackageFeatureIcon(key as PackageFeatureKey);
            return (
              <p key={key} className="flex items-start gap-2 text-muted-foreground">
                <Icon className="size-4 shrink-0" aria-hidden />
                {feature.type === 'NUMBER'
                  ? fl(key, { count: Number(val) })
                  : fl(key)}
              </p>
            );
          })}
        </div>
        <div className="mt-auto flex items-center justify-between pt-4">
          {Number(pkg.discountedPrice) > 0 ? (
            <div className="flex flex-col">
              <span className="text-xl font-bold text-foreground">
                {Intl.NumberFormat(locale, {
                  style: 'currency',
                  currency: 'IRR',
                  minimumFractionDigits: 0,
                }).format(Number(pkg.discountedPrice))}
              </span>
              {Number(pkg.actualPrice) > Number(pkg.discountedPrice) ? (
                <span className="text-xs text-muted-foreground line-through">
                  {Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: 'IRR',
                    minimumFractionDigits: 0,
                  }).format(Number(pkg.actualPrice))}
                </span>
              ) : null}
            </div>
          ) : <div />}
          {onActivate ? (
            <Button size="sm" onClick={() => onActivate(pkg)}>
              {pkg.isTrial ? t('packages.trial') : t('packages.buy')}
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/dashboard/subscription">
                {pkg.isTrial ? t('packages.trial') : t('packages.buy')}
              </Link>
            </Button>
          )}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto" dir="rtl" hideCloseButton>
          <DialogHeader>
            <DialogTitle className="text-right">{pkg.title}</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap text-right text-foreground/80">
              {pkg.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button variant="outline">بستن</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
