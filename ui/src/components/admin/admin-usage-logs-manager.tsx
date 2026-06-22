'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGetAdminUsageLogsQuery } from '@/features/api/endpoints/usage-logs';

export function AdminUsageLogsManager() {
  const t = useTranslations('admin.usageLogs');
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [feature, setFeature] = useState('');

  const { data, isFetching, isLoading } = useGetAdminUsageLogsQuery({
    page,
    limit: 50,
    userId: userId || undefined,
    feature: feature || undefined,
  });

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="userId">{t('userId')}</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => { setUserId(e.target.value); setPage(1); }}
                placeholder={t('userIdPlaceholder')}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="feature">{t('feature')}</Label>
              <Input
                id="feature"
                value={feature}
                onChange={(e) => { setFeature(e.target.value); setPage(1); }}
                placeholder={t('featurePlaceholder')}
              />
            </div>
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
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.feature')}</th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.action')}</th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((log) => (
                    <tr key={log.id} className="border-b border-border/60 last:border-b-0">
                      <td className="whitespace-nowrap py-3 pr-4 text-foreground">
                        {log.user ? `${log.user.phone}${log.user.firstName ? ` (${log.user.firstName})` : ''}` : log.userId}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">{log.feature}</td>
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">{log.action}</td>
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                        {new Date(log.consumedAt).toLocaleString('fa-IR')}
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
    </div>
  );
}
