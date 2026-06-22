'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetMyUsageLimitsQuery, useGetMyUsageLogsQuery } from '@/features/api/endpoints/usage-logs';

export function UsageManager() {
  const t = useTranslations('dashboard.usage');
  const { data: limits, isLoading: limitsLoading } = useGetMyUsageLimitsQuery();
  const { data: logs, isLoading: logsLoading } = useGetMyUsageLogsQuery({ limit: 20 });

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('description')}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {limitsLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="size-4 animate-spin" />
            </CardContent>
          </Card>
        ) : limits?.features && limits.features.length > 0 ? (
          limits.features.map((f) => {
            const pct = f.limit > 0 ? Math.round((f.current / f.limit) * 100) : 0;
            return (
              <Card key={f.feature}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{f.feature}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between text-2xl font-bold">
                    {f.current}
                    <span className="text-sm font-normal text-muted-foreground">/ {f.limit}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {f.remaining > 0 ? t('remaining', { count: f.remaining }) : t('exhausted')}
                  </p>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t('noLimits')}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('history')}</CardTitle>
          <CardDescription>{t('historyDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : logs?.items && logs.items.length > 0 ? (
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left rtl:text-right">
                  <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.feature')}</th>
                  <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.action')}</th>
                  <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.time')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.items.map((log) => (
                  <tr key={log.id} className="border-b border-border/60 last:border-b-0">
                    <td className="whitespace-nowrap py-3 pr-4 text-foreground">{log.feature}</td>
                    <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">{log.action}</td>
                    <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                      {new Date(log.consumedAt).toLocaleString('fa-IR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">{t('noHistory')}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
