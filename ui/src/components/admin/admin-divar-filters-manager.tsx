'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useGetDivarCategoryFilterQuery,
  useGetDivarCategoryFiltersQuery,
} from '@/features/api/apiSlice';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function AdminDivarFiltersManager() {
  const t = useTranslations('admin.divarFilters');
  const {
    data: filters = [],
    isLoading,
    isFetching,
  } = useGetDivarCategoryFiltersQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const {
    data: selectedFilter,
    isFetching: isFetchingFilter,
  } = useGetDivarCategoryFilterQuery(selectedSlug ?? '', {
    skip: !selectedSlug || !dialogOpen,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredFilters = useMemo(() => {
    if (!normalizedSearch) {
      return filters;
    }
    return filters.filter((entry) => {
      const haystack = `${entry.categoryName} ${entry.categorySlug} ${entry.displayPath}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [filters, normalizedSearch]);

  const isBusy = isLoading || isFetching;
  const hasSearch = normalizedSearch.length > 0;

  const formatDate = (value: string): string => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <label className="flex w-full flex-col gap-1 text-sm text-muted-foreground sm:max-w-xs">
            <span className="font-medium text-foreground">{t('search.label')}</span>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('search.placeholder')}
              autoComplete="off"
            />
          </label>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left">
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.category')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.slug')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.displayPath')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.updatedAt')}
                </th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">
                  {t('columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isBusy ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredFilters.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    {hasSearch ? t('search.empty') : t('empty')}
                  </td>
                </tr>
              ) : (
                filteredFilters.map((entry) => (
                  <tr key={entry.categoryId} className="border-b border-border/60 last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-foreground">{entry.categoryName}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground sm:text-sm">
                      {entry.categorySlug}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{entry.displayPath}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground sm:text-sm">
                      {formatDate(entry.updatedAt)}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs font-medium text-primary hover:text-primary"
                        onClick={() => {
                          setSelectedSlug(entry.categorySlug);
                          setDialogOpen(true);
                        }}
                      >
                        {t('actions.viewPayload')}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setSelectedSlug(null);
        }
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('payload.title')}</DialogTitle>
            <DialogDescription>
              {selectedFilter
                ? t('payload.description', { name: selectedFilter.categoryName })
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">{t('columns.slug')}:</span>{' '}
                {selectedFilter?.categorySlug ?? '—'}
              </p>
              <p>
                <span className="font-medium text-foreground">{t('payload.displayPath')}:</span>{' '}
                {selectedFilter?.displayPath ?? '—'}
              </p>
              <p>
                <span className="font-medium text-foreground">{t('columns.updatedAt')}:</span>{' '}
                {selectedFilter ? formatDate(selectedFilter.updatedAt) : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
              {isFetchingFilter ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  <span>{t('payload.loading')}</span>
                </div>
              ) : selectedFilter ? (
                <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap text-xs text-foreground" dir="ltr">
                  {JSON.stringify(selectedFilter.payload, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">{t('payload.empty')}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
