'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Crown, Loader2, Sparkles, TicketPercent, UserPlus, Zap } from 'lucide-react';

import {
  useGetCurrentSubscriptionQuery,
  useGetAvailablePackagesQuery,
  useActivateSubscriptionMutation,
  useGetActivationStatusQuery,
  useRequestActivationMutation,
} from '@/features/api/endpoints/subscriptions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HomePackageCard } from '@/components/home/home-package-card';
import type { SubscriptionPackage } from '@/types/packages';

function CurrentSubscriptionCard() {
  const t = useTranslations('dashboard.subscriptionPage');
  const { data: subscription, isLoading, error } = useGetCurrentSubscriptionQuery();

  if (isLoading) {
    return (
      <Card className="border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10">
        <CardHeader>
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-60 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error || !subscription) {
    return null;
  }

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(subscription.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <Card className="border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Crown className="size-5 text-emerald-600" aria-hidden />
          <CardTitle className="text-lg">{t('current.title')}</CardTitle>
        </div>
        <CardDescription>{t('current.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            {subscription.package?.title}
          </span>
          <span className="text-muted-foreground">
            {t('current.daysLeft', { count: daysLeft })}
          </span>
          {subscription.isTrial && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Sparkles className="size-3" aria-hidden />
              {t('current.trial')}
            </span>
          )}
          {subscription.bonusDays > 0 && (
            <span className="text-xs text-muted-foreground">
              {t('current.bonusDays', { count: subscription.bonusDays })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivateDialog({
  pkg,
  open,
  onOpenChange,
}: {
  pkg: SubscriptionPackage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('dashboard.subscriptionPage');
  const { toast } = useToast();
  const [activate, { isLoading }] = useActivateSubscriptionMutation();
  const [discountCode, setDiscountCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  if (!pkg) return null;

  const handleActivate = async () => {
    try {
      await activate({
        packageId: pkg.id,
        discountCode: discountCode.trim() || undefined,
        inviteCode: inviteCode.trim() || undefined,
      }).unwrap();
      toast({ title: t('activate.success') });
      onOpenChange(false);
      setDiscountCode('');
      setInviteCode('');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'data' in err
          ? String((err as { data: { message?: string } }).data?.message ?? '')
          : '';
      toast({
        title: t('activate.error'),
        description: message || undefined,
        variant: 'destructive',
      });
    }
  };

  const price = Number(pkg.discountedPrice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('activate.title')}</DialogTitle>
          <DialogDescription>{t('activate.description', { title: pkg.title })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{pkg.title}</span>
              <span className="text-lg font-bold">{price.toLocaleString()}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{t('package.duration', { count: pkg.durationDays })}</span>
              {pkg.freeDays > 0 && (
                <span>+{t('package.freeDays', { count: pkg.freeDays })}</span>
              )}
            </div>
          </div>

          {pkg.features?.allow_discount_codes === 'true' && (
            <div className="space-y-2">
              <Label htmlFor="discountCode" className="flex items-center gap-2">
                <TicketPercent className="size-4 text-muted-foreground" aria-hidden />
                {t('activate.discountLabel')}
              </Label>
              <Input
                id="discountCode"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder={t('activate.discountPlaceholder')}
                maxLength={64}
              />
            </div>
          )}

          {pkg.features?.allow_invite_codes === 'true' && (
            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="flex items-center gap-2">
                <UserPlus className="size-4 text-muted-foreground" aria-hidden />
                {t('activate.inviteLabel')}
              </Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder={t('activate.invitePlaceholder')}
                maxLength={64}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('activate.cancel')}
          </Button>
          <Button onClick={handleActivate} disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Zap className="size-4 animate-pulse" aria-hidden />
                {t('activate.processing')}
              </span>
            ) : (
              t('activate.confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActivationStatusCard() {
  const t = useTranslations('dashboard.subscriptionPage');
  const { data: status, isLoading } = useGetActivationStatusQuery();

  if (isLoading) return null;
  if (!status) return null;
  if (status.activationStatus !== 'PENDING') return null;

  return (
    <Card className="border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="size-5 animate-spin text-amber-600" aria-hidden />
          <CardTitle className="text-lg">{t('activation.pendingTitle')}</CardTitle>
        </div>
        <CardDescription>{t('activation.pendingDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{t('activation.pendingMessage')}</p>
      </CardContent>
    </Card>
  );
}

function RejectedActivationCard() {
  const t = useTranslations('dashboard.subscriptionPage');
  const { data: status } = useGetActivationStatusQuery();

  if (!status || status.activationStatus !== 'REJECTED') return null;

  return (
    <Card className="border-red-500/20 bg-red-50/50 dark:bg-red-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✕</span>
          <CardTitle className="text-lg">{t('activation.rejectedTitle')}</CardTitle>
        </div>
        <CardDescription>{t('activation.rejectedDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {status.activationNote && (
          <p className="text-sm text-muted-foreground">{status.activationNote}</p>
        )}
      </CardContent>
    </Card>
  );
}

function PackageCardWrapper({ pkg }: { pkg: SubscriptionPackage }) {
  const { data: activationStatus } = useGetActivationStatusQuery();
  const t = useTranslations('dashboard.subscriptionPage');
  const { toast } = useToast();
  const [requestActivation] = useRequestActivationMutation();
  const [activatingPkg, setActivatingPkg] = useState<SubscriptionPackage | null>(null);

  const isRejected = activationStatus?.activationStatus === 'REJECTED';

  const handleActivate = async (p: SubscriptionPackage) => {
    if (isRejected) {
      try {
        await requestActivation({ packageId: p.id }).unwrap();
        toast({ title: t('activation.requested') });
      } catch {
        toast({ title: t('activation.error'), variant: 'destructive' });
      }
    } else {
      setActivatingPkg(p);
    }
  };

  return (
    <>
      <HomePackageCard pkg={pkg} onActivate={handleActivate} />
      <ActivateDialog
        pkg={activatingPkg}
        open={Boolean(activatingPkg)}
        onOpenChange={(open) => { if (!open) setActivatingPkg(null); }}
      />
    </>
  );
}

export function SubscriptionPanel() {
  const t = useTranslations('dashboard.subscriptionPage');
  const { data: packages = [], isLoading, error } = useGetAvailablePackagesQuery();
  const { data: activationStatus } = useGetActivationStatusQuery();

  const isApproved = activationStatus?.activationStatus === 'APPROVED';
  const isRejected = activationStatus?.activationStatus === 'REJECTED';
  const showPackages = isApproved || isRejected;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('description')}</p>
      </div>

      <ActivationStatusCard />

      <RejectedActivationCard />

      <CurrentSubscriptionCard />

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/20">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">{t('loadError')}</p>
          </CardContent>
        </Card>
      ) : !showPackages ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t('activation.requireApproval')}</p>
          </CardContent>
        </Card>
      ) : packages.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t('empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCardWrapper key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </div>
  );
}
