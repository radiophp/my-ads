'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bookmark, Eye, RefreshCw, Trash2 } from 'lucide-react';
import { skipToken } from '@reduxjs/toolkit/query';

import {
  useGetSavedFiltersQuery,
  useDeleteSavedFilterMutation,
  useUpdateSavedFilterMutation,
  useGetProvincesQuery,
  useGetCitiesQuery,
  useGetDistrictsQuery,
  useGetRingBinderFoldersQuery,
  useGetPublicDivarCategoryFilterQuery,
} from '@/features/api/apiSlice';
import type { SavedFilter } from '@/types/saved-filters';
import type { CategoryFilterValue } from '@/features/search-filter/searchFilterSlice';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

export function SavedFiltersPanel() {
  const t = useTranslations('dashboard.savedFiltersPage');
  const tFilterLabels = useTranslations('dashboard.filters.categoryFilters.widgetLabels');
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
  const [updateSavedFilter, { isLoading: isUpdating }] = useUpdateSavedFilterMutation();
  const [pendingDelete, setPendingDelete] = useState<SavedFilter | null>(null);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [viewingFilter, setViewingFilter] = useState<SavedFilter | null>(null);

  const { data: provinces = [] } = useGetProvincesQuery();
  const { data: cities = [] } = useGetCitiesQuery();
  const { data: districts = [] } = useGetDistrictsQuery();
  const { data: ringBinderData } = useGetRingBinderFoldersQuery();

  const activeCategorySlug = useMemo(() => {
    if (!viewingFilter) return null;
    return (
      viewingFilter.payload.categorySelection.slug ??
      Object.keys(viewingFilter.payload.categoryFilters ?? {})[0] ??
      null
    );
  }, [viewingFilter]);

  const {
    data: categoryFilterDetail,
  } = useGetPublicDivarCategoryFilterQuery(activeCategorySlug ?? skipToken);

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

  const handleToggleNotifications = async (filter: SavedFilter, enabled: boolean) => {
    setPendingToggleId(filter.id);
    try {
      await updateSavedFilter({ id: filter.id, body: { notificationsEnabled: enabled } }).unwrap();
      toast({
        title: enabled ? t('toast.notificationsEnabledTitle') : t('toast.notificationsDisabledTitle'),
        description: t('toast.notificationsUpdatedDescription', { name: filter.name }),
      });
    } catch (error) {
      console.error('Failed to toggle notifications', error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.notificationsToggleError'),
        variant: 'destructive',
      });
    } finally {
      setPendingToggleId(null);
    }
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
                className="bg-card/50 flex flex-col gap-4 rounded-2xl border border-border/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">{filter.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('item.updated', { value: formatTimestamp(filter.updatedAt) })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs">
                    <span>{t('item.notificationsLabel')}</span>
                    <Switch
                      checked={filter.notificationsEnabled}
                      disabled={isUpdating || pendingToggleId === filter.id}
                      aria-label={t('item.notificationsAria', { name: filter.name })}
                      onCheckedChange={(checked) => void handleToggleNotifications(filter, checked)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingFilter(filter)}
                    className="inline-flex items-center gap-2"
                  >
                    <Eye className="size-4" aria-hidden />
                    {t('item.view')}
                  </Button>
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
      <Dialog open={Boolean(viewingFilter)} onOpenChange={(open) => !open && setViewingFilter(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('details.title', { name: viewingFilter?.name ?? '' })}</DialogTitle>
            <DialogDescription>
              {viewingFilter
                ? t('item.updated', { value: formatTimestamp(viewingFilter.updatedAt) })
                : null}
            </DialogDescription>
          </DialogHeader>
          {viewingFilter ? (
            <FilterDetails
              filter={viewingFilter}
              provinces={provinces}
              cities={cities}
              districts={districts}
              ringBinderFolders={ringBinderData?.folders ?? []}
              categoryName={categoryFilterDetail?.categoryName ?? activeCategorySlug ?? ''}
              normalizedOptions={categoryFilterDetail?.normalizedOptions ?? {}}
              filterLabel={(key) => {
                try {
                  return tFilterLabels(key as never);
                } catch {
                  return key;
                }
              }}
              onClose={() => setViewingFilter(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SavedFiltersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className="bg-card/50 animate-pulse rounded-2xl border border-border/70 p-4">
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

type FilterDetailsProps = {
  filter: SavedFilter;
  provinces: { id: number; name: string }[];
  cities: { id: number; name: string }[];
  districts: { id: number; name: string; cityId: number }[];
  ringBinderFolders: { id: string; name: string }[];
  categoryName: string;
  normalizedOptions: Record<string, { value: string; label: string }[]>;
  filterLabel: (key: string) => string;
  onClose: () => void;
};

function FilterDetails({
  filter,
  provinces,
  cities,
  districts,
  ringBinderFolders,
  categoryName,
  normalizedOptions,
  filterLabel,
}: FilterDetailsProps) {
  const t = useTranslations('dashboard.savedFiltersPage');
  const provinceName =
    filter.payload.provinceId === null
      ? t('details.all')
      : provinces.find((p) => p.id === filter.payload.provinceId)?.name ??
        String(filter.payload.provinceId);

  const citiesById = useMemo(() => new Map(cities.map((c) => [c.id, c.name])), [cities]);
  const districtsById = useMemo(() => new Map(districts.map((d) => [d.id, d.name])), [districts]);
  const folderById = useMemo(
    () => new Map(ringBinderFolders.map((folder) => [folder.id, folder.name])),
    [ringBinderFolders],
  );

  const cityLabel =
    filter.payload.citySelection.mode === 'all'
      ? t('details.all')
      : filter.payload.citySelection.cityIds.length > 0
        ? filter.payload.citySelection.cityIds
            .map((id) => citiesById.get(id) ?? String(id))
            .join(', ')
        : t('details.none');

  const districtLabel =
    filter.payload.districtSelection.mode === 'all'
      ? t('details.all')
      : filter.payload.districtSelection.districtIds.length > 0
        ? filter.payload.districtSelection.districtIds
            .map((id) => districtsById.get(id) ?? String(id))
            .join(', ')
        : t('details.none');

  const noteLabel = t(`details.note.${filter.payload.noteFilter}`);
  const folderLabel = filter.payload.ringBinderFolderId
    ? folderById.get(filter.payload.ringBinderFolderId) ?? filter.payload.ringBinderFolderId
    : t('details.none');

  const activeCategorySlug =
    filter.payload.categorySelection.slug ??
    Object.keys(filter.payload.categoryFilters ?? {})[0] ??
    null;
  const categoryFilters =
    activeCategorySlug && filter.payload.categoryFilters
      ? filter.payload.categoryFilters[activeCategorySlug] ?? {}
      : {};

  const formattedCategoryFilters = Object.entries(categoryFilters).map(([key, value]) => ({
    key,
    label: t('details.filterKey', { key: filterLabel(key) }),
    value: formatCategoryFilterValue(value, normalizedOptions[key] ?? [], t),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <DetailRow label={t('details.province')} value={provinceName} />
        <DetailRow label={t('details.cities')} value={cityLabel} />
        <DetailRow label={t('details.districts')} value={districtLabel} />
        <DetailRow label={t('details.category')} value={categoryName || t('details.none')} />
        <DetailRow label={t('details.noteFilter')} value={noteLabel} />
        <DetailRow label={t('details.folder')} value={folderLabel} />
        <DetailRow
          label={t('details.notifications')}
          value={filter.notificationsEnabled ? t('details.enabled') : t('details.disabled')}
        />
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
        <p className="text-sm font-semibold text-foreground">{t('details.categoryFilters')}</p>
        {formattedCategoryFilters.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('details.noCategoryFilters')}</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            {formattedCategoryFilters.map((entry) => (
              <li key={entry.key}>
                <span className="font-medium text-foreground">{entry.label}:</span>{' '}
                <span>{entry.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatCategoryFilterValue(
  value: CategoryFilterValue,
  options: { value: string; label: string }[],
  t: ReturnType<typeof useTranslations<'dashboard.savedFiltersPage'>>,
): string {
  switch (value.kind) {
    case 'numberRange': {
      const min = value.min ?? '–';
      const max = value.max ?? '–';
      return t('details.range', { min, max });
    }
    case 'multiSelect': {
      if (!value.values || value.values.length === 0) return t('details.none');
      const labels = value.values.map(
        (val) => options.find((opt) => opt.value === val)?.label ?? val,
      );
      return labels.join(', ');
    }
    case 'singleSelect': {
      const label = options.find((opt) => opt.value === value.value)?.label ?? value.value;
      return label ? String(label) : t('details.none');
    }
    case 'boolean':
      return value.value ? t('details.enabled') : t('details.disabled');
    default:
      return t('details.none');
  }
}
