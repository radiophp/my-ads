'use client';

import { useState } from 'react';
import { Check, Loader2, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  useGetAdminUsersQuery,
  useApproveActivationMutation,
  useRejectActivationMutation,
} from '@/features/api/endpoints/users';

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export function AdminUsersManager() {
  const t = useTranslations('admin.users');
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activationFilter, setActivationFilter] = useState<string | undefined>(undefined);

  const { data, isFetching, isLoading } = useGetAdminUsersQuery({
    page,
    limit: 20,
    search: search || undefined,
    activationStatus: activationFilter,
  });
  const [approve, { isLoading: approving }] = useApproveActivationMutation();
  const [reject, { isLoading: rejecting }] = useRejectActivationMutation();

  const handleApprove = async (userId: string) => {
    try {
      await approve(userId).unwrap();
      toast({ title: t('approveSuccess') });
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await reject({ id: userId }).unwrap();
      toast({ title: t('rejectSuccess') });
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    }
  };

  const isLoadingData = isLoading || isFetching;

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={t('searchPlaceholder')}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {['PENDING', 'APPROVED', 'REJECTED', undefined].map((status) => (
                <Button
                  key={status ?? 'all'}
                  variant={activationFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setActivationFilter(status); setPage(1); }}
                >
                  {status ? t(`filter.${status}`) : t('filter.all')}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoadingData ? (
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
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.phone')}</th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.name')}</th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.role')}</th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.activation')}</th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.subscription')}</th>
                    <th className="whitespace-nowrap py-3 pr-4 font-medium text-muted-foreground">{t('columns.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((user) => (
                    <tr key={user.id} className="border-b border-border/60 last:border-b-0">
                      <td className="whitespace-nowrap py-3 pr-4 font-medium text-foreground">{user.phone}</td>
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                        {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${user.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[user.activationStatus] ?? ''}`}>
                          {t(`status.${user.activationStatus}`)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                        {user.currentSubscription
                          ? `${user.currentSubscription.packageTitle}`
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap py-3">
                        {user.activationStatus === 'PENDING' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(user.id)}
                              disabled={approving || rejecting}
                            >
                              <Check className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(user.id)}
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
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      {t('prev')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
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
