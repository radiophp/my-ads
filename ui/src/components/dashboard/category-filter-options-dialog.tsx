'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import type { FilterOptionsModalState } from './category-filter-types';
import { OptionIndicator } from './category-filter-option-indicator';

type FilterOptionsDialogProps = {
  modal: FilterOptionsModalState | null;
  open: boolean;
  onClose: () => void;
  selectedMultiValues: string[];
  selectedSingleValue: string | null;
  onConfirmMulti: (key: string, values: string[]) => void;
  onConfirmSingle: (key: string, value: string | null) => void;
  isRTL: boolean;
  placeholder: string;
  translation: ReturnType<typeof useTranslations>;
};

export function FilterOptionsDialog({
  modal,
  open,
  onClose,
  selectedMultiValues,
  selectedSingleValue,
  onConfirmMulti,
  onConfirmSingle,
  isRTL,
  placeholder,
  translation,
}: FilterOptionsDialogProps) {
  const t = translation;
  const [draftMulti, setDraftMulti] = useState<string[]>(selectedMultiValues);
  const [draftSingle, setDraftSingle] = useState<string | null>(selectedSingleValue);

  useEffect(() => {
    if (modal?.type === 'multi') {
      setDraftMulti(selectedMultiValues);
    }
  }, [selectedMultiValues, modal?.key, modal?.type]);

  useEffect(() => {
    if (modal?.type === 'single') {
      setDraftSingle(selectedSingleValue);
    }
  }, [selectedSingleValue, modal?.key, modal?.type]);

  if (!modal) {
    return null;
  }

  const confirm = () => {
    if (modal.type === 'multi') {
      onConfirmMulti(modal.key, draftMulti);
    } else {
      onConfirmSingle(modal.key, draftSingle ?? null);
    }
  };

  const clear = () => {
    if (modal.type === 'multi') {
      setDraftMulti([]);
    } else {
      setDraftSingle(null);
    }
  };

  const isMulti = modal.type === 'multi';
  const options = modal.options;
  const hasDraftSelection = isMulti ? draftMulti.length > 0 : Boolean(draftSingle);

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
                {modal.title}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={clear}
                disabled={!hasDraftSelection}
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
                <DialogTitle>{modal.title}</DialogTitle>
                <DialogDescription className="sr-only">{modal.title}</DialogDescription>
              </DialogHeader>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={clear}
                disabled={!hasDraftSelection}
              >
                <span className="flex items-center justify-center gap-2">
                  <Eraser className="size-4" aria-hidden="true" />
                  <span>{t('categoryFilters.clear')}</span>
                </span>
              </Button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-6 py-4 lg:px-4">
            {options.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('categoryFilters.empty')}</p>
            ) : (
              <ul className="divide-y divide-border" dir={isRTL ? 'rtl' : 'ltr'}>
                {options.map((option) => {
                  const checked = isMulti
                    ? draftMulti.includes(option.value)
                    : draftSingle === option.value;

                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        role={isMulti ? 'checkbox' : 'radio'}
                        aria-checked={checked}
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-4 text-sm transition-colors hover:bg-muted/20',
                          checked ? 'bg-muted/10' : null,
                          isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left',
                        )}
                        onClick={() => {
                          if (isMulti) {
                            setDraftMulti((prev) =>
                              prev.includes(option.value)
                                ? prev.filter((value) => value !== option.value)
                                : [...prev, option.value],
                            );
                            return;
                          }
                          setDraftSingle(option.value);
                        }}
                      >
                        <OptionIndicator checked={checked} />
                        <span className="flex-1">{option.label}</span>
                      </button>
                    </li>
                  );
                })}
                {!isMulti && modal.clearable ? (
                  <li>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!draftSingle}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-4 text-sm text-muted-foreground transition-colors hover:bg-muted/20',
                        isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left',
                      )}
                      onClick={() => setDraftSingle(null)}
                    >
                      <OptionIndicator checked={!draftSingle} />
                      <span className="flex-1">{placeholder}</span>
                    </button>
                  </li>
                ) : null}
              </ul>
            )}
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
