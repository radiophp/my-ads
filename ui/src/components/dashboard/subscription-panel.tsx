'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Crown, Image as ImageIcon, Loader2, Sparkles, TicketPercent, Upload, UserPlus, Zap } from 'lucide-react';

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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HomePackageCard } from '@/components/home/home-package-card';
import {
  useGetBankAccountsQuery,
  useInitiatePaymentMutation,
  useUploadReceiptMutation,
  useValidateCodeMutation,
} from '@/features/api/endpoints/payments';
import { useGetWebsiteSettingsQuery } from '@/features/api/endpoints/website-settings';
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

  const dialogOpen = open && pkg !== null;

  const resetState = useCallback(() => {
    setDiscountCode('');
    setInviteCode('');
  }, []);

  const handleActivate = async () => {
    if (!pkg) return;
    try {
      await activate({
        packageId: pkg.id,
        discountCode: discountCode.trim() || undefined,
        inviteCode: inviteCode.trim() || undefined,
      }).unwrap();
      toast({ title: t('activate.success') });
      onOpenChange(false);
      resetState();
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

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const price = pkg ? Number(pkg.discountedPrice) : 0;

  return (
    <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="flex flex-col gap-0 p-0 max-md:!inset-0 max-md:max-h-dvh max-md:!translate-x-0 max-md:!translate-y-0 max-md:rounded-none sm:max-w-md">
        <div className="shrink-0 px-6 pt-6">
          <DialogHeader>
            <DialogTitle>{t('activate.title')}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <p className="text-sm text-muted-foreground">
            {pkg ? t('activate.description', { title: pkg.title }) : ''}
          </p>
          {pkg && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{pkg.title}</span>
                  {price > 0 && (
                    <span className="text-lg font-bold">{price.toLocaleString()}</span>
                  )}
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
          )}
        </div>

        <div className="shrink-0 border-t px-6 py-4">
          <div className="flex flex-row-reverse gap-2">
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
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              {t('activate.cancel')}
            </Button>
          </div>
        </div>
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

function PriceBreakdown({
  originalPrice,
  taxPercentage,
  discountAmount,
}: {
  originalPrice: number;
  taxPercentage: number;
  discountAmount: number | null;
}) {
  const t = useTranslations('dashboard.subscriptionPage');
  const taxableAmount = originalPrice;
  const taxAmount = Math.round(taxableAmount * (taxPercentage / 100));
  const finalPrice = taxableAmount + taxAmount - (discountAmount ?? 0);

  return (
    <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{t('payment.priceRow')}</span>
        <span>{originalPrice.toLocaleString()} {t('package.currency')}</span>
      </div>
      {taxPercentage > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('payment.taxRow', { percent: taxPercentage })}</span>
          <span>{taxAmount.toLocaleString()} {t('package.currency')}</span>
        </div>
      )}
      {discountAmount != null && discountAmount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('payment.discountRow')}</span>
          <span className="text-red-500 dark:text-red-400">
            -{discountAmount.toLocaleString()} {t('package.currency')}
          </span>
        </div>
      )}
      <hr className="border-border/60" />
      <div className="flex items-center justify-between font-semibold">
        <span>{t('payment.finalPrice')}</span>
        <span className="text-lg font-bold">{finalPrice.toLocaleString()} {t('package.currency')}</span>
      </div>
    </div>
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
  const { data: settings } = useGetWebsiteSettingsQuery();
  const { data: bankAccounts, isLoading: banksLoading } = useGetBankAccountsQuery();
  const [initiate, { isLoading: initiating }] = useInitiatePaymentMutation();
  const [uploadReceipt, { isLoading: uploading }] = useUploadReceiptMutation();
  const [validateCode, { isLoading: validating }] = useValidateCodeMutation();
  const [activeType, setActiveType] = useState<'discount' | 'invite' | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<{
    code: string;
    codeId: string;
    type: 'discount' | 'invite';
    adjustedPrice?: number;
    discountAmount?: number;
    bonusDays?: number;
  } | null>(null);
  const [codeError, setCodeError] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'form' | 'upload' | 'success' | 'error'>('form');
  const fileRef = useRef<HTMLInputElement>(null);

  const taxPercentage = settings?.taxPercentage ?? 0;
  const originalPrice = pkg ? Number(pkg.discountedPrice) : 0;
  const isPaid = originalPrice > 0;
  const dialogOpen = open && pkg !== null && isPaid;
  const discountAmount = appliedCode?.type === 'discount' ? (appliedCode.discountAmount ?? 0) : null;

  const canApplyCode = codeInput.trim().length > 0 && !validating;
  const showDiscountToggle = pkg?.features?.allow_discount_codes === 'true';
  const showInviteToggle = pkg?.features?.allow_invite_codes === 'true';

  const resetState = useCallback(() => {
    setActiveType(null);
    setCodeInput('');
    setAppliedCode(null);
    setCodeError('');
    setPaymentId(null);
    setFile(null);
    setStep('form');
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const handleToggle = (type: 'discount' | 'invite') => {
    if (activeType === type) {
      setActiveType(null);
      setAppliedCode(null);
      setCodeInput('');
      setCodeError('');
      return;
    }
    if (activeType !== null) {
      setActiveType(type);
      setAppliedCode(null);
      setCodeInput('');
      setCodeError('');
      toast({ description: t('payment.mutualExclusive') });
      return;
    }
    setActiveType(type);
    setCodeInput('');
    setCodeError('');
  };

  const handleApplyCode = async () => {
    if (!pkg || !activeType || !codeInput.trim()) return;
    setCodeError('');
    try {
      const result = await validateCode({
        packageId: pkg.id,
        code: codeInput.trim(),
        type: activeType,
      }).unwrap();
      if (result.valid) {
        setAppliedCode({
          code: codeInput.trim(),
          codeId: result.codeId,
          type: activeType,
          adjustedPrice: result.adjustedPrice,
          discountAmount: result.discountAmount,
          bonusDays: result.bonusDays,
        });
        toast({ description: t('payment.codeApplied') });
      } else {
        setCodeError(result.message);
        const remaining = result.remainingAttempts;
        if (remaining !== undefined && remaining > 0) {
          toast({ description: t('payment.wrongCodeWarning', { count: remaining }) });
        }
      }
    } catch {
      setCodeError(t('payment.codeError'));
    }
  };

  const handleInitiate = async () => {
    if (!pkg) return;
    try {
      const payload: { packageId: string; discountCode?: string; inviteCode?: string } = {
        packageId: pkg.id,
      };
      if (appliedCode?.type === 'discount') {
        payload.discountCode = appliedCode.code;
      } else if (appliedCode?.type === 'invite') {
        payload.inviteCode = appliedCode.code;
      }
      const result = await initiate(payload).unwrap();
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

  return (
    <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="flex flex-col gap-0 p-0 max-md:!inset-0 max-md:max-h-dvh max-md:!translate-x-0 max-md:!translate-y-0 max-md:rounded-none sm:max-w-lg">
        <div className="shrink-0 px-6 pt-6">
          {step === 'success' ? (
            <DialogHeader>
              <DialogTitle>{t('payment.successTitle')}</DialogTitle>
            </DialogHeader>
          ) : (
            <DialogHeader>
              <DialogTitle>{t('payment.title')}</DialogTitle>
            </DialogHeader>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {step === 'success' ? (
            <DialogDescription className="sr-only">{t('payment.successDesc')}</DialogDescription>
          ) : (
            <p className="text-sm text-muted-foreground">
              {pkg ? t('payment.description', { title: pkg.title }) : ''}
            </p>
          )}
          {step === 'success' ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {t('payment.pendingMessage')}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {pkg && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{pkg.title}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{t('package.duration', { count: pkg.durationDays })}</span>
                    {pkg.freeDays > 0 && (
                      <span>+{t('package.freeDays', { count: pkg.freeDays })}</span>
                    )}
                  </div>
                </div>
              )}

              <PriceBreakdown
                originalPrice={originalPrice}
                taxPercentage={taxPercentage}
                discountAmount={discountAmount}
              />

              {step === 'form' && (
                <>
                  {(showDiscountToggle || showInviteToggle) && (
                    <div className="space-y-3">
                      {showDiscountToggle && (
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm">
                          <div className="flex flex-1 items-center gap-2">
                            <TicketPercent className="size-4 text-muted-foreground" aria-hidden />
                            <span>{t('payment.discountToggle')}</span>
                          </div>
                          <Switch
                            checked={activeType === 'discount'}
                            onCheckedChange={() => handleToggle('discount')}
                          />
                        </label>
                      )}
                      {showInviteToggle && (
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm">
                          <div className="flex flex-1 items-center gap-2">
                            <UserPlus className="size-4 text-muted-foreground" aria-hidden />
                            <span>{t('payment.inviteToggle')}</span>
                          </div>
                          <Switch
                            checked={activeType === 'invite'}
                            onCheckedChange={() => handleToggle('invite')}
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {activeType && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={codeInput}
                          onChange={(e) => { setCodeInput(e.target.value); setCodeError(''); }}
                          placeholder={t('payment.codePlaceholder')}
                          maxLength={64}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          onClick={handleApplyCode}
                          disabled={!canApplyCode}
                        >
                          {validating ? <Loader2 className="size-4 animate-spin" /> : t('payment.applyCode')}
                        </Button>
                      </div>
                      {codeError && (
                        <p className="text-xs text-red-500">{codeError}</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {step === 'upload' && (
                <>
                  {banksLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  ) : bankAccounts && bankAccounts.length > 0 ? (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">{t('payment.bankAccounts')}</Label>
                      {bankAccounts.map((acc) => (
                        <div key={acc.id} className="space-y-2 rounded-lg border p-3 text-sm">
                          <p className="font-medium">{acc.bankName}</p>
                          <div>
                            <p className="text-xs text-muted-foreground">{t('payment.cardNumber')}</p>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(acc.cardNumber.replace(/[-\s]/g, ''));
                                  toast({ description: t('payment.copied') });
                                }}
                                className="flex items-center gap-1.5 text-left font-mono text-muted-foreground transition-colors hover:text-foreground"
                                dir="ltr"
                              >
                                {acc.cardNumber}
                                <Copy className="size-3.5 shrink-0" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{t('payment.cardHolder')}</p>
                            <p>{acc.cardHolderName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{t('payment.sheba')}</p>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(acc.sheba.replace(/[-\s]/g, ''));
                                  toast({ description: t('payment.copied') });
                                }}
                                className="flex items-center gap-1.5 text-left font-mono text-muted-foreground transition-colors hover:text-foreground"
                                dir="ltr"
                              >
                                {acc.sheba}
                                <Copy className="size-3.5 shrink-0" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{t('payment.uploadDesc')}</p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    {file ? (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-muted/30 p-8">
                        <ImageIcon className="size-10 shrink-0 text-muted-foreground" />
                        <div className="text-center text-sm">
                          <p className="truncate font-medium">{file.name}</p>
                          <p className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                          {t('payment.changeFile')}
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        <Upload className="size-10" />
                        <span>{t('payment.selectFile')}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t px-6 py-4">
          {step === 'success' ? (
            <div className="flex flex-row-reverse gap-2">
              <Button onClick={handleClose}>{t('payment.close')}</Button>
            </div>
          ) : step === 'upload' ? (
            <div className="flex flex-row-reverse gap-2">
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? <Loader2 className="size-4 animate-spin" /> : t('payment.submitReceipt')}
              </Button>
              <Button variant="outline" onClick={() => setStep('form')}>
                {t('payment.back')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-row-reverse gap-2">
              <Button onClick={handleInitiate} disabled={initiating}>
                {initiating ? <Loader2 className="size-4 animate-spin" /> : t('payment.next')}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                {t('activate.cancel')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PackageCardWrapper({ pkg }: { pkg: SubscriptionPackage }) {
  const { data: activationStatus } = useGetActivationStatusQuery();
  const t = useTranslations('dashboard.subscriptionPage');
  const { toast } = useToast();
  const [requestActivation] = useRequestActivationMutation();
  const [showActivate, setShowActivate] = useState(false);
  const [showPay, setShowPay] = useState(false);

  const isRejected = activationStatus?.activationStatus === 'REJECTED';
  const isPaid = Number(pkg.discountedPrice) > 0;

  const handleActivate = async (_p: SubscriptionPackage) => {
    if (isRejected) {
      try {
        await requestActivation({ packageId: pkg.id }).unwrap();
        toast({ title: t('activation.requested') });
      } catch {
        toast({ title: t('activation.error'), variant: 'destructive' });
      }
    } else if (isPaid) {
      setShowPay(true);
    } else {
      setShowActivate(true);
    }
  };

  return (
    <>
      <HomePackageCard pkg={pkg} onActivate={handleActivate} />
      <ActivateDialog
        pkg={showActivate ? pkg : null}
        open={showActivate}
        onOpenChange={(open) => { if (!open) setShowActivate(false); }}
      />
      <PaymentDialog
        pkg={showPay ? pkg : null}
        open={showPay}
        onOpenChange={(open) => { if (!open) setShowPay(false); }}
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
