'use client';

import { useTranslations } from 'next-intl';

import { X } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SavedFilter } from '@/types/saved-filters';
import { cn } from '@/lib/utils';

interface SavedFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedFilters: SavedFilter[];
  savedFiltersBusy: boolean;
  savedFiltersLimit: number;
  handleApplySavedFilter: (filter: SavedFilter) => void;
  locale: string;
}

export function SavedFiltersDialog({
  open,
  onOpenChange,
  savedFilters,
  savedFiltersBusy,
  savedFiltersLimit,
  handleApplySavedFilter,
  locale,
}: SavedFiltersDialogProps) {
  const savedFiltersT = useTranslations('dashboard.filters.saved');
  const totalSavedFilters = savedFilters.length;
  const isRTL = ['fa', 'ar', 'he'].includes(locale);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disableBackClose>
      <DialogContent
        hideCloseButton
        className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] lg:left-1/2 lg:top-1/2 lg:flex lg:max-h-[90vh] lg:w-full lg:max-w-xl lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border lg:p-6"
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-border px-6 py-4 lg:hidden">
            <p className={cn('text-base font-semibold', isRTL ? 'text-right' : 'text-left')}>
              {savedFiltersT('title')}
            </p>
            <p className={cn('mt-1 text-sm text-muted-foreground', isRTL ? 'text-right' : 'text-left')}>
              {savedFiltersT('usage', { count: totalSavedFilters, limit: savedFiltersLimit })}
            </p>
          </div>

          <div className="hidden px-0 py-4 lg:block">
            <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
              <DialogTitle>{savedFiltersT('title')}</DialogTitle>
              <DialogDescription>
                {savedFiltersT('usage', { count: totalSavedFilters, limit: savedFiltersLimit })}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4 lg:px-4">
            {savedFiltersBusy ? (
              <div className="space-y-3">
                {['one', 'two', 'three'].map((key) => (
                  <div key={key} className="h-14 animate-pulse rounded-xl bg-muted/40" />
                ))}
              </div>
            ) : savedFilters.length === 0 ? (
              <p className="text-sm text-muted-foreground">{savedFiltersT('empty')}</p>
            ) : (
              <ul className="space-y-3">
                {savedFilters.map((filter) => (
                  <li
                    key={filter.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{filter.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {savedFiltersT('lastUpdated', {
                          value: new Date(filter.updatedAt).toLocaleString(locale, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }),
                        })}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        handleApplySavedFilter(filter);
                        onOpenChange(false);
                      }}
                    >
                      {savedFiltersT('apply')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border bg-background/95 px-6 py-4 lg:border-0 lg:bg-transparent lg:px-4">
            <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              <span className="flex items-center justify-center gap-2">
                <X className="size-4" aria-hidden="true" />
                <span>{savedFiltersT('dialog.cancel')}</span>
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
