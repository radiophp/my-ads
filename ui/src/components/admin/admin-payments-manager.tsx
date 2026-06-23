'use client';

import { useState } from 'react';
import { Check, ExternalLink, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  useGetAdminPaymentsQuery,
  useApprovePaymentMutation,
  useRejectPaymentMutation,
} from '@/features/api/endpoints/payments';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const STATUS_COLORS: Record<string, string> = {
  INITIATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export function AdminPaymentsManager() {
  const t = useTranslations('admin.payments');
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>('PENDING');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
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
      await approve(id).unwrap();
      toast({ title: t('approveSuccess') });
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
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
            {['PENDING', 'INITIATED', 'APPROVED', 'REJECTED', undefined].map((status) => (
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
                  {data.items.map((payment) => (
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
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4">
                        {payment.receiptUrl ? (
                          <a
                            href={`/storage/uploads/${payment.receiptUrl}`}
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
                        {payment.status === 'PENDING' && payment.receiptUrl && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(payment.id)}
                              disabled={approving || rejecting}
                            >
                              <Check className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRejectingId(payment.id)}
                              disabled={approving || rejecting}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
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
