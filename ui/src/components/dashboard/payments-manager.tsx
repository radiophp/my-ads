'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  useGetMyPaymentsQuery,
  useReUploadReceiptMutation,
} from '@/features/api/endpoints/payments';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_ICONS: Record<string, string> = {
  PENDING: '⏳',
  APPROVED: '✅',
  REJECTED: '❌',
};

export function PaymentsManager() {
  const t = useTranslations('dashboard.payments');
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [reUploading, setReUploading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useGetMyPaymentsQuery({ page, limit: 20 });
  const [reUpload] = useReUploadReceiptMutation();

  const handleReUpload = async (id: string, file: File) => {
    try {
      await reUpload({ id, file }).unwrap();
      toast({ title: t('reUploadSuccess') });
      setReUploading(null);
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
  };

  const onFileSelect = (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleReUpload(id, file);
    }
    e.target.value = '';
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('description')}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t('empty')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.items.map((payment) => (
            <Card key={payment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{STATUS_ICONS[payment.status]}</span>
                    <div>
                      <CardTitle className="text-base">{payment.package?.title}</CardTitle>
                      <CardDescription>
                        {new Date(payment.createdAt).toLocaleDateString('fa-IR')}
                      </CardDescription>
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[payment.status] ?? ''}`}
                  >
                    {t(`status.${payment.status}`)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('amount')}</span>
                  <span className="font-semibold">{Number(payment.amount).toLocaleString()} {t('currency')}</span>
                </div>

                {payment.receiptUrl && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('receipt')}: </span>
                    <a
                      href={`/storage/uploads/${payment.receiptUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {t('viewReceipt')}
                    </a>
                  </div>
                )}

                {payment.status === 'REJECTED' && (
                  <div className="space-y-3 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900/30 dark:bg-red-950/10">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {payment.rejectionReason
                        ? t('rejectionReason', { reason: payment.rejectionReason })
                        : t('rejectionNoReason')}
                    </p>
                    <div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onFileSelect(payment.id)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileRef.current?.click()}
                        disabled={reUploading === payment.id}
                      >
                        {reUploading === payment.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Upload className="size-4" />
                        )}
                        {t('reUpload')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
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
        </div>
      )}
    </div>
  );
}
