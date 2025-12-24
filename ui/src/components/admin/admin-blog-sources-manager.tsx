'use client';

import { useMemo } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  useGetAdminBlogSourcesQuery,
  useUpdateAdminBlogSourceMutation,
} from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import type { BlogSource } from '@/types/blog';
import { cn } from '@/lib/utils';

export function AdminBlogSourcesManager() {
  const t = useTranslations('admin.blogSources');
  const { toast } = useToast();
  const { data: sources = [], isLoading, isFetching, refetch } = useGetAdminBlogSourcesQuery();
  const [updateSource, { isLoading: isUpdating }] = useUpdateAdminBlogSourceMutation();

  const busy = isLoading || isFetching || isUpdating;

  const sorted = useMemo(
    () => [...sources].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [sources],
  );

  const toggleActive = async (source: BlogSource) => {
    try {
      await updateSource({
        id: source.id,
        body: { isActive: !source.isActive },
      }).unwrap();
      toast({ title: t('toast.updatedTitle'), description: t('toast.updatedDescription') });
    } catch (error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={busy}>
              <RefreshCw className={cn('mr-2 size-4', busy && 'animate-spin')} aria-hidden />
              {t('actions.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left rtl:text-right">
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.name')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.slug')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.active')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.updated')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {busy ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                sorted.map((source) => (
                  <tr key={source.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-foreground">{source.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{source.slug}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {source.isActive ? t('status.active') : t('status.inactive')}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(source.updatedAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={source.isActive}
                          onCheckedChange={() => void toggleActive(source)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {source.isActive ? t('actions.deactivate') : t('actions.activate')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
