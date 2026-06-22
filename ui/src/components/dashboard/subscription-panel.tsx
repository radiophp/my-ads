'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Crown, Image as ImageIcon, Loader2, Sparkles, TicketPercent, Upload, UserPlus, Zap } from 'lucide-react';

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
import {
  useGetBankAccountsQuery,
  useInitiatePaymentMutation,
  useUploadReceiptMutation,
} from '@/features/api/endpoints/payments';
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

function PaymentDialog({
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
  const { data: bankAccounts, isLoading: banksLoading } = useGetBankAccountsQuery();
  const [initiate, { isLoading: initiating }] = useInitiatePaymentMutation();
  const [uploadReceipt, { isLoading: uploading }] = useUploadReceiptMutation();
  const [discountCode, setDiscountCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'form' | 'upload' | 'success' | 'error'>('form');
  const [_errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setDiscountCode('');
    setInviteCode('');
    setPaymentId(null);
    setFile(null);
    setStep('form');
    setErrorMsg('');
    onOpenChange(false);
  }, [onOpenChange]);

  const handleInitiate = async () => {
    if (!pkg) return;
    try {
      const result = await initiate({
        packageId: pkg.id,
        discountCode: discountCode.trim() || undefined,
        inviteCode: inviteCode.trim() || undefined,
      }).unwrap();
      setPaymentId(result.id);
      setStep('upload');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'data' in err
          ? String((err as { data: { message?: string } }).data?.message ?? '')
          : t('payment.error');
      toast({ title: msg, variant: 'destructive' });
    }
  };

  const handleUpload = async () => {
    if (!paymentId || !file) return;
    try {
      await uploadReceipt({ id: paymentId, file }).unwrap();
      setStep('success');
      toast({ title: t('payment.success') });
    } catch {
      toast({ title: t('payment.uploadError'), variant: 'destructive' });
    }
  };

  const price = pkg ? Number(pkg.discountedPrice) : 0;
  const isPaid = price > 0;
  const dialogOpen = open && pkg !== null && isPaid;

  return (
    <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        {step === 'success' ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('payment.successTitle')}</DialogTitle>
              <DialogDescription>{t('payment.successDesc')}</DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center text-sm text-muted-foreground">
              {t('payment.pendingMessage')}
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>{t('payment.close')}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('payment.title')}</DialogTitle>
              <DialogDescription>
                {pkg ? t('payment.description', { title: pkg.title }) : ''}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {pkg && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{pkg.title}</span>
                    <span className="text-lg font-bold">
                      {price.toLocaleString()} {t('package.currency')}
                    </span>
                  </div>
                </div>
              )}

              {step === 'form' && (
                <>
                  {banksLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  ) : bankAccounts && bankAccounts.length > 0 ? (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">{t('payment.bankAccounts')}</Label>
                      {bankAccounts.map((acc) => (
                        <div key={acc.id} className="space-y-1 rounded-lg border p-3 text-sm">
                          <p className="font-medium">{acc.bankName}</p>
                          <p className="text-muted-foreground" dir="ltr">
                            {t('payment.cardNumber')}: {acc.cardNumber}
                          </p>
                          <p className="text-muted-foreground">{t('payment.cardHolder')}: {acc.cardHolderName}</p>
                          <p className="text-muted-foreground" dir="ltr">
                            {t('payment.sheba')}: {acc.sheba}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {pkg?.features?.allow_discount_codes === 'true' && (
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

                  {pkg?.features?.allow_invite_codes === 'true' && (
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

                  <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                      {t('activate.cancel')}
                    </Button>
                    <Button onClick={handleInitiate} disabled={initiating}>
                      {initiating ? <Loader2 className="size-4 animate-spin" /> : t('payment.next')}
                    </Button>
                  </DialogFooter>
                </>
              )}

              {step === 'upload' && (
                <>
                  <p className="text-sm text-muted-foreground">{t('payment.uploadDesc')}</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                      <ImageIcon className="size-8 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="truncate font-medium">{file.name}</p>
                        <p className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                        {t('payment.changeFile')}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                      <Upload className="size-4" />
                      {t('payment.selectFile')}
                    </Button>
                  )}
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setStep('form')}>
                      {t('payment.back')}
                    </Button>
                    <Button onClick={handleUpload} disabled={!file || uploading}>
                      {uploading ? <Loader2 className="size-4 animate-spin" /> : t('payment.submitReceipt')}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PackageCardWrapper({ pkg }: { pkg: SubscriptionPackage }) {
  const { data: activationStatus } = useGetActivationStatusQuery();
  const t = useTranslations('dashboard.subscriptionPage');
  const { toast } = useToast();
  const [requestActivation] = useRequestActivationMutation();
  const [activatingPkg, setActivatingPkg] = useState<SubscriptionPackage | null>(null);
  const [payingPkg, setPayingPkg] = useState<SubscriptionPackage | null>(null);

  const isRejected = activationStatus?.activationStatus === 'REJECTED';
  const isPaid = Number(pkg.discountedPrice) > 0;

  const handleActivate = async (p: SubscriptionPackage) => {
    if (isRejected) {
      try {
        await requestActivation({ packageId: p.id }).unwrap();
        toast({ title: t('activation.requested') });
      } catch {
        toast({ title: t('activation.error'), variant: 'destructive' });
      }
    } else if (isPaid) {
      setPayingPkg(p);
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
      <PaymentDialog
        pkg={payingPkg}
        open={Boolean(payingPkg)}
        onOpenChange={(open) => { if (!open) setPayingPkg(null); }}
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
