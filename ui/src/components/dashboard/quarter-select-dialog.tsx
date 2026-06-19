'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Eraser, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { generateQuarterOptions, DEFAULT_QUARTER_VALUE } from '@/features/search-filter/date-quarter-utils';
import { OptionIndicator } from './category-filter-option-indicator';

type QuarterSelectDialogProps = {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (value: string) => void;
};

export function QuarterSelectDialog({
  open,
  onClose,
  value,
  onSelect,
}: QuarterSelectDialogProps) {
  const isRTL = useLocale() === 'fa';
  const t = useTranslations('dashboard.filters');
  const [draftValue, setDraftValue] = useState<string>(value);

  const quarterOptions = useMemo(() => generateQuarterOptions(), []);

  const confirm = useCallback(() => {
    onSelect(draftValue);
    onClose();
  }, [draftValue, onSelect, onClose]);

  const clear = useCallback(() => {
    setDraftValue(DEFAULT_QUARTER_VALUE);
  }, []);

  const isNonDefault = draftValue !== DEFAULT_QUARTER_VALUE;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)} disableBackClose>
      <DialogContent
        hideCloseButton
        className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] lg:left-1/2 lg:top-1/2 lg:flex lg:max-h-[90vh] lg:w-full lg:max-w-xl lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border lg:p-6"
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-border px-6 py-4 lg:hidden">
            <div className="flex items-center gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
              <p className={cn('flex-1 text-base font-semibold', isRTL ? 'text-right' : 'text-left')}>
                {t('dateQuarter')}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={clear}
                disabled={!isNonDefault}
              >
                <span className="flex items-center justify-center gap-2">
                  <Eraser className="size-4" aria-hidden="true" />
                  <span>{t('categoryFilters.clear')}</span>
                </span>
              </Button>
            </div>
          </div>

          <div className="hidden px-0 py-4 lg:block">
            <div className="flex items-center gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
              <DialogHeader className={cn('flex-1', isRTL ? 'text-right' : 'text-left')}>
                <DialogTitle>{t('dateQuarter')}</DialogTitle>
                <DialogDescription className="sr-only">{t('dateQuarter')}</DialogDescription>
              </DialogHeader>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={clear}
                disabled={!isNonDefault}
              >
                <span className="flex items-center justify-center gap-2">
                  <Eraser className="size-4" aria-hidden="true" />
                  <span>{t('categoryFilters.clear')}</span>
                </span>
              </Button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-6 py-4 lg:px-4">
            <ul className="divide-y divide-border" dir={isRTL ? 'rtl' : 'ltr'}>
              <li>
                <button
                  type="button"
                  role="radio"
                  aria-checked={draftValue === DEFAULT_QUARTER_VALUE}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-4 text-sm transition-colors hover:bg-muted/20',
                    draftValue === DEFAULT_QUARTER_VALUE ? 'bg-muted/10' : 'text-muted-foreground',
                    isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left',
                  )}
                  onClick={() => setDraftValue(DEFAULT_QUARTER_VALUE)}
                >
                  <OptionIndicator checked={draftValue === DEFAULT_QUARTER_VALUE} />
                  <span className="flex-1">{t('dateQuarterAll')}</span>
                </button>
              </li>
              {quarterOptions.map((option) => {
                const checked = draftValue === option.value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-4 text-sm transition-colors hover:bg-muted/20',
                        checked ? 'bg-muted/10' : null,
                        isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left',
                      )}
                      onClick={() => setDraftValue(option.value)}
                    >
                      <OptionIndicator checked={checked} />
                      <span className="flex-1">{option.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="border-t border-border bg-background/95 px-6 py-4 lg:border-0 lg:bg-transparent lg:px-4">
            <div
              className={cn(
                'flex flex-row flex-wrap gap-3',
                isRTL ? 'lg:flex-row-reverse' : 'lg:flex-row',
              )}
            >
              <Button type="button" className="min-w-[120px] flex-1" onClick={confirm}>
                <span className="flex items-center justify-center gap-2">
                  <Check className="size-4" aria-hidden="true" />
                  <span>{t('applyFilters')}</span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-w-[120px] flex-1"
                onClick={onClose}
              >
                <span className="flex items-center justify-center gap-2">
                  <X className="size-4" aria-hidden="true" />
                  <span>{t('cityModalCancel')}</span>
                </span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
