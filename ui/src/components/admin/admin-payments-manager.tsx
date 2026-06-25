'use client';

import { useEffect, useState } from 'react';
import {
  Check,
  ExternalLink,
  Loader2,
  PencilLine,
  X,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  useGetAdminPaymentsQuery,
  useFinalizePaymentMutation,
  useApprovePaymentMutation,
  useRejectPaymentMutation,
} from '@/features/api/endpoints/payments';
import { useGetPackageQuery } from '@/features/api/endpoints/packages';
import { NumberInput } from '@/components/ui/number-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PACKAGE_FEATURES } from '@/components/admin/constants/package-features.constants';
import { FEATURE_LABELS } from '@/components/admin/constants/feature-labels.constants';
import { getPackageFeatureIcon } from '@/components/shared/package-feature-icons';
import type { PackageFeatureKey } from '@/components/admin/constants/package-features.constants';

const STATUS_COLORS: Record<string, string> = {
  INITIATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const DISTRICT_FEATURES = new Set(['districts_limit', 'builders_archive', 'archive_history_quarters']);

function ReviewDialog({
  paymentId,
  open,
  onOpenChange,
}: {
  paymentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('admin.payments');
  const locale = useLocale();
  const { toast } = useToast();
  const { data: payment } = useGetAdminPaymentsQuery({ page: 1, limit: 1, status: undefined }, {
    skip: !paymentId,
    selectFromResult: (result) => ({
      ...result,
      data: result.data?.items?.find((p) => p.id === paymentId),
    }),
  });
  const { data: pkg } = useGetPackageQuery(payment?.packageId ?? '', {
    skip: !payment?.packageId,
  });
  const [finalize, { isLoading: finalizing }] = useFinalizePaymentMutation();

  const priceSnapshots = pkg?.priceSnapshots ?? [];
  const snapshotMap = new Map(priceSnapshots.map((s) => [s.featureKey, s]));
  const featureConfigs = pkg?.featureConfigs ?? [];
  const configMap = new Map(featureConfigs.map((c) => [c.featureKey, c]));
  const initialExtras: Record<string, number> = {};
  if (payment?.featureExtras) {
    for (const [k, v] of Object.entries(payment.featureExtras)) {
      initialExtras[k] = v as number;
    }
  }
  const [featureExtras, setFeatureExtras] = useState<Record<string, number>>(initialExtras);
  const basePrice = Number(payment?.originalPrice ?? 0);
  const extrasTotal = Object.entries(featureExtras).reduce((sum, [key, v]) => {
    const c = configMap.get(key);
    return sum + v * (c?.extraUnitPrice ? Number(c.extraUnitPrice) : 0);
  }, 0);
  const suggestedTotal = basePrice + extrasTotal;
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '0');
  const [adminNote, setAdminNote] = useState(payment?.adminNote ?? '');

  useEffect(() => {
    setAmount(String(suggestedTotal));
  }, [suggestedTotal]);

  const handleFinalize = async () => {
    if (!paymentId) return;
    const numAmount = Number(amount);
    if (numAmount < 0) {
      toast({ title: t('reviewDialog.invalidPrice'), variant: 'destructive' });
      return;
    }
    try {
      await finalize({
        id: paymentId,
        body: {
          featureExtras,
          amount: numAmount,
          adminNote: adminNote || undefined,
        },
      }).unwrap();
      toast({ title: t('reviewDialog.finalized') });
      onOpenChange(false);
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <div className="shrink-0 px-6 pt-6">
          <DialogHeader>
            <DialogTitle>{t('reviewDialog.title')}</DialogTitle>
            <DialogDescription>
              {payment?.user ? `${payment.user.phone}${payment.user.firstName ? ` (${payment.user.firstName})` : ''}` : payment?.userId}
              {' — '}
              {payment?.package?.title ?? ''}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <div className="space-y-5 py-2">
            {/* Feature Extras */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{t('reviewDialog.featureExtras')}</h4>
              <p className="text-xs text-muted-foreground">{t('reviewDialog.featureExtrasHint')}</p>
              <div className="grid gap-2 grid-cols-1">
                {(Object.entries(PACKAGE_FEATURES) as [PackageFeatureKey, typeof PACKAGE_FEATURES[PackageFeatureKey]][]).map(([key, feature]) => {
                  const Icon = getPackageFeatureIcon(key);
                  const snapshot = snapshotMap.get(key);
                  const config = configMap.get(key);
                  const baseLimit = snapshot?.limitValue ?? config?.limitValue ?? 0;
                  const maxExtra = config?.maxExtra ?? 0;
                  const isDistrict = DISTRICT_FEATURES.has(key);
                  const currentExtra = featureExtras[key] ?? 0;
                  return (
                    <div
                      key={key}
                      className={`flex items-start gap-2 rounded-md border px-3 py-2 ${isDistrict ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700/40 dark:bg-amber-950/10' : 'border-border/50'}`}
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex items-center gap-x-2">
                          <span className="text-sm font-medium text-foreground">
                            {FEATURE_LABELS[key]?.[locale as 'fa' | 'en'] ?? key}
                            {isDistrict && (
                              <span className="mr-1 text-[10px] text-amber-600 dark:text-amber-400">
                                🏘️
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t('reviewDialog.base')}: {feature.type === 'BOOLEAN' ? (baseLimit > 0 ? t('reviewDialog.yes') : t('reviewDialog.no')) : baseLimit}
                          </span>
                        </div>
                        {maxExtra > 0 && (
                          <NumberInput
                            value={currentExtra}
                            onChange={(val) => setFeatureExtras((prev) => ({ ...prev, [key]: val }))}
                            max={maxExtra}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{t('reviewDialog.priceSection')}</h4>
              <div className="space-y-2">
                <div className="flex h-9 items-center justify-between rounded-md border bg-muted/30 px-3 text-sm">
                  <span className="text-muted-foreground">{t('reviewDialog.packagePrice')}</span>
                  <span className="font-medium text-foreground">{Number(payment?.originalPrice ?? 0).toLocaleString()}</span>
                </div>
                {Object.entries(featureExtras).filter(([, v]) => v > 0).map(([key, v]) => {
                  const config = configMap.get(key);
                  const unitPrice = config?.extraUnitPrice ? Number(config.extraUnitPrice) : 0;
                  const lineTotal = v * unitPrice;
                  return (
                    <div key={key} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">
                        {(FEATURE_LABELS[key]?.[locale as 'fa' | 'en'] ?? key)}: {v} × {unitPrice.toLocaleString()}
                      </span>
                      <span className="font-medium text-foreground">{lineTotal.toLocaleString()}</span>
                    </div>
                  );
                })}
                {extrasTotal > 0 && (
                  <div className="flex h-9 items-center justify-between rounded-md border bg-muted/30 px-3 text-sm">
                    <span className="text-muted-foreground">{t('reviewDialog.extrasTotal')}</span>
                    <span className="font-medium text-foreground">{extrasTotal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex h-9 items-center justify-between rounded-md border bg-muted/30 px-3 text-sm">
                  <span className="text-muted-foreground">{t('reviewDialog.computedTotal')}</span>
                  <span className="font-medium text-foreground">{suggestedTotal.toLocaleString()}</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('reviewDialog.adminPrice')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="flex h-9 items-center justify-between rounded-md border bg-muted/30 px-3 text-sm">
                  <span className="text-muted-foreground">{t('reviewDialog.taxPercent')}</span>
                  <span className="font-medium text-foreground">{payment?.taxPercentage ?? 0}%</span>
                </div>
                <div className="flex h-9 items-center justify-between rounded-md border bg-muted/30 px-3 text-sm">
                  <span className="text-muted-foreground">{t('reviewDialog.finalAmount')}</span>
                  <span className="font-medium text-foreground">
                    {Number(Number(amount) > 0 ? Number(amount) * (1 + (payment?.taxPercentage ?? 0) / 100) : 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Note */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">{t('reviewDialog.adminNote')}</h4>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={t('reviewDialog.notePlaceholder')}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t px-6 py-4">
          <div className="flex flex-row-reverse gap-2">
            <Button onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? <Loader2 className="size-4 animate-spin" /> : t('reviewDialog.finalize')}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('reviewDialog.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdminPaymentsManager() {
  const t = useTranslations('admin.payments');
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>('INITIATED');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isFetching, isLoading } = useGetAdminPaymentsQuery({
    page,
    limit: 20,
    status: statusFilter,
  });
  const [approve, { isLoading: approving }] = useApprovePaymentMutation();
  const [reject, { isLoading: rejecting }] = useRejectPaymentMutation();

  const handleApprove = async (id: string) => {
    try {
      setApprovingId(id);
      await approve(id).unwrap();
      toast({ title: t('approveSuccess') });
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    try {
      await reject({ id: rejectingId, reason: rejectReason || undefined }).unwrap();
      toast({ title: t('rejectSuccess') });
      setRejectingId(null);
      setRejectReason('');
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
  };

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {['INITIATED', 'PENDING', 'APPROVED', 'REJECTED', undefined].map((status) => (
              <Button
                key={status ?? 'all'}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setStatusFilter(status); setPage(1); }}
              >
                {status ? t(`filter.${status}`) : t('filter.all')}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">{t('empty')}</div>
          ) : (
            <>
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left rtl:text-right">
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.user')}</th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.package')}</th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.amount')}</th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.status')}</th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.receipt')}</th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((payment) => {
                    const isInitiated = payment.status === 'INITIATED';
                    const isPending = payment.status === 'PENDING';
                    const hasReview = payment.adminReviewedAt != null;
                    return (
                      <tr key={payment.id} className="border-b border-border/60 last:border-b-0">
                        <td className="whitespace-nowrap py-3 pr-4 text-foreground">
                          {payment.user
                            ? `${payment.user.phone}${payment.user.firstName ? ` (${payment.user.firstName})` : ''}`
                            : payment.userId}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">{payment.package?.title}</td>
                        <td className="whitespace-nowrap py-3 pr-4 font-medium">{Number(payment.amount).toLocaleString()}</td>
                        <td className="whitespace-nowrap py-3 pr-4">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[payment.status] ?? ''}`}>
                            {t(`status.${payment.status}`)}
                            {isInitiated && hasReview && (
                              <span className="mr-1 text-[10px]">✓</span>
                            )}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4">
                          {payment.receiptUrl ? (
                            <a
                              href={`/storage/upload/${payment.receiptUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              {t('viewReceipt')}
                              <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-3">
                          <div className="flex gap-2">
                            {isInitiated && (
                              <Button
                                size="sm"
                                variant={hasReview ? 'secondary' : 'default'}
                                onClick={() => setReviewingId(payment.id)}
                              >
                                {hasReview ? <PencilLine className="size-4" /> : t('reviewButton')}
                              </Button>
                            )}
                            {isPending && payment.receiptUrl && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApprove(payment.id)}
                                  disabled={approving || rejecting || approvingId === payment.id}
                                >
                                  {approvingId === payment.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setRejectingId(payment.id)}
                                  disabled={approving || rejecting}
                                >
                                  <X className="size-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <span className="text-sm text-muted-foreground">
                    {t('pageInfo', { page: data.page, totalPages: data.totalPages, total: data.total })}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      {t('prev')}
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                      {t('next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <ReviewDialog
        paymentId={reviewingId}
        open={Boolean(reviewingId)}
        onOpenChange={(open) => { if (!open) setReviewingId(null); }}
      />

      {/* Reject Dialog */}
      <Dialog open={Boolean(rejectingId)} onOpenChange={(open) => { if (!open) { setRejectingId(null); setRejectReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('rejectDialog.title')}</DialogTitle>
            <DialogDescription>{t('rejectDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">{t('rejectDialog.reason')}</Label>
            <Textarea
              id="reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('rejectDialog.placeholder')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingId(null); setRejectReason(''); }}>
              {t('rejectDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejecting}>
              {rejecting ? <Loader2 className="size-4 animate-spin" /> : t('rejectDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
