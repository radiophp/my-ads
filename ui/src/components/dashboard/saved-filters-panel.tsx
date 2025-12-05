'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bookmark, RefreshCw, Trash2 } from 'lucide-react';

import { useGetSavedFiltersQuery, useDeleteSavedFilterMutation } from '@/features/api/apiSlice';
import type { SavedFilter } from '@/types/saved-filters';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export function SavedFiltersPanel() {
  const t = useTranslations('dashboard.savedFiltersPage');
  const locale = useLocale();
  const { toast } = useToast();
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useGetSavedFiltersQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [deleteSavedFilter, { isLoading: isDeleting }] = useDeleteSavedFilterMutation();
  const [pendingDelete, setPendingDelete] = useState<SavedFilter | null>(null);

  const filters = data?.filters ?? [];
  const limit = data?.limit ?? 0;
  const remaining = data?.remaining ?? Math.max(limit - filters.length, 0);
  const busy = isLoading || isFetching;

  const summaryLine = useMemo(() => {
    if (!data) {
      return null;
    }
    return t('summary', { count: filters.length, limit, remaining });
  }, [data, filters.length, limit, remaining, t]);

  const handleRefresh = () => {
    refetch();
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    try {
      await deleteSavedFilter(pendingDelete.id).unwrap();
      toast({
        title: t('toast.deletedTitle'),
        description: t('toast.deletedDescription', { name: pendingDelete.name }),
      });
    } catch (error) {
      console.error('Failed to delete saved filter', error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
    } finally {
      setPendingDelete(null);
    }
  };

  const formatTimestamp = (value: string) =>
    new Date(value).toLocaleString(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  return (
    <div className="min-h-[70vh] w-full bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Bookmark className="size-3.5" aria-hidden />
            {t('badge')}
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
            <p className="text-base text-muted-foreground">{t('description')}</p>
          </div>
          {summaryLine ? <p className="text-sm text-muted-foreground">{summaryLine}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={busy}
              className="inline-flex items-center gap-2"
            >
              <RefreshCw className={cn('size-4', busy && 'animate-spin')} aria-hidden />
              {busy ? t('refreshing') : t('refresh')}
            </Button>
          </div>
        </header>

        {busy ? (
          <SavedFiltersSkeleton />
        ) : filters.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
        ) : (
          <ul className="space-y-4">
            {filters.map((filter) => (
              <li
                key={filter.id}
                className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{filter.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('item.updated', { value: formatTimestamp(filter.updatedAt) })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setPendingDelete(filter)}
                  >
                    <Trash2 className="mr-2 size-4" aria-hidden />
                    {t('item.delete')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.description', { name: pendingDelete?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('dialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('dialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SavedFiltersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className="animate-pulse rounded-2xl border border-border/70 bg-card/50 p-4">
          <div className="h-5 w-1/3 rounded bg-muted" />
          <div className="mt-2 h-4 w-1/4 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
};

function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center">
      <Bookmark className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden />
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
