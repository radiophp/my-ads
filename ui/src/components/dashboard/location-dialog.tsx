'use client';

import { useTranslations } from 'next-intl';

import { Check, X } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type LocationLevel = 'province' | 'city' | 'district';

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: LocationLevel;
  isRTL: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  options: { value: number; label: string }[];
  allSelected: boolean;
  selectedIds: number[];
  onSelectAll: () => void;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
  onApply: () => void;
  onCancel: () => void;
}

function SelectionIndicator({
  type,
  checked,
}: {
  type: 'radio' | 'checkbox';
  checked: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-sm border bg-background',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
        type === 'radio' && 'rounded-full',
      )}
    >
      {checked ? <Check className="size-3.5" /> : null}
    </span>
  );
}

export function LocationDialog({
  open,
  onOpenChange,
  level,
  isRTL,
  query,
  onQueryChange,
  options,
  allSelected,
  selectedIds,
  onSelectAll,
  onToggle,
  onRemove,
  onApply,
  onCancel,
}: LocationDialogProps) {
  const t = useTranslations('dashboard.filters');
  const selectionType = level === 'province' ? 'radio' : 'checkbox';

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disableBackClose>
      <DialogContent
        hideCloseButton
        dir={isRTL ? 'rtl' : 'ltr'}
        className={cn(
          'left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] lg:left-1/2 lg:top-1/2 lg:flex lg:max-h-[90vh] lg:w-full lg:max-w-xl lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border-0 lg:p-6',
          isRTL ? 'text-right' : 'text-left',
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-border px-6 py-4 lg:hidden" dir={isRTL ? 'rtl' : 'ltr'}>
            <p
              className={`text-base font-semibold ${
                isRTL ? 'text-right' : 'text-center'
              }`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {t(`${level}ModalTitle`)}
            </p>
            <p
              className={cn(
                'mt-1 text-sm text-muted-foreground',
                isRTL ? 'text-right' : 'text-center',
              )}
            >
              {t(`${level}ModalDescription`)}
            </p>
          </div>
          <div className="hidden p-0 lg:block" dir={isRTL ? 'rtl' : 'ltr'}>
            <div
              className={cn(
                'flex flex-col space-y-1.5',
                isRTL ? 'items-end text-right' : 'items-start text-left',
              )}
            >
              <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
                {t(`${level}ModalTitle`)}
              </DialogTitle>
              <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
                {t(`${level}ModalDescription`)}
              </DialogDescription>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
            <div className="mb-2 mt-1">
              <Input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={t(`${level}ModalSearch`)}
                className="h-10 rounded-lg shadow-none ring-0 focus-visible:ring-0"
              />
            </div>
            {!allSelected && selectedIds.length > 0 ? (
              <div className="flex flex-wrap gap-2 pb-2">
                {options
                  .filter((opt) => selectedIds.includes(opt.value))
                  .map((opt) => (
                    <span
                      key={opt.value}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-medium text-foreground"
                    >
                      {opt.label}
                      <button
                        type="button"
                        className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                        aria-label={t(`${level}ModalCancel`)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onRemove(opt.value)}
                      >
                        <X className="size-3" aria-hidden />
                      </button>
                    </span>
                  ))}
              </div>
            ) : null}
            <button
              type="button"
              role={selectionType}
              aria-checked={allSelected}
              dir={isRTL ? 'rtl' : 'ltr'}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border border-dashed border-input px-3 py-4 text-sm font-medium transition-colors hover:bg-muted/20',
                isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left',
              )}
              onClick={onSelectAll}
            >
              <SelectionIndicator type={selectionType} checked={allSelected} />
              <span className="flex-1">{t(`${level}ModalSelectAll`)}</span>
            </button>

            <div className="rounded-xl border-0">
              {options.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {t(`${level}ModalEmpty`)}
                </p>
              ) : (
                <ul aria-label={t(`${level}ModalTitle`)}>
                  {options.map((opt) => (
                    <li key={opt.value} className="border-b border-border">
                      <button
                        type="button"
                        role={selectionType}
                        aria-checked={
                          !allSelected && selectedIds.includes(opt.value)
                        }
                        dir={isRTL ? 'rtl' : 'ltr'}
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-4 text-sm transition-colors hover:bg-muted/20',
                          isRTL
                            ? 'flex-row-reverse text-right'
                            : 'flex-row text-left',
                        )}
                        onClick={() => onToggle(opt.value)}
                      >
                        <SelectionIndicator
                          type={selectionType}
                          checked={
                            !allSelected && selectedIds.includes(opt.value)
                          }
                        />
                        <span className="flex-1">{opt.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="border-t border-border bg-background/95 px-6 py-4 lg:border-0 lg:bg-transparent lg:px-0">
            <div className="flex flex-row justify-end gap-3">
              <Button
                className="flex-1"
                type="button"
                onClick={onApply}
                disabled={level === 'province' ? !allSelected && selectedIds.length === 0 : false}
              >
                <span className="flex items-center justify-center gap-2">
                  <Check className="size-4" aria-hidden="true" />
                  <span>{t(`${level}ModalConfirm`)}</span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
              >
                <span className="flex items-center justify-center gap-2">
                  <X className="size-4" aria-hidden="true" />
                  <span>{t(`${level}ModalCancel`)}</span>
                </span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
