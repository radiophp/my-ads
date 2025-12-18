import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Folder } from 'lucide-react';
import type { useTranslations } from 'next-intl';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { DivarCategory } from '@/types/divar-category';
import { cn } from '@/lib/utils';

type CategoryStructures = {
  byId: Map<string, DivarCategory>;
  children: Map<string | null, DivarCategory[]>;
};

type TranslateFn = ReturnType<typeof useTranslations>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseCategory: DivarCategory | null;
  categoryStructures: CategoryStructures;
  selectedCategory: DivarCategory | null;
  isRTL: boolean;
  onSelect: (category: DivarCategory) => void;
  t: TranslateFn;
};

const hasChildren = (category: DivarCategory | null, structures: CategoryStructures) =>
  !!category && (structures.children.get(category.id)?.length ?? 0) > 0;

type SelectionIndicatorProps = {
  checked: boolean;
};

function SelectionIndicator({ checked }: SelectionIndicatorProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-sm border bg-background',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
      )}
    >
      {checked ? <Check className="size-3.5" /> : null}
    </span>
  );
}

export function CategorySelectionModal({
  open,
  onOpenChange,
  baseCategory,
  categoryStructures,
  selectedCategory,
  isRTL,
  onSelect,
  t,
}: Props) {
  const [path, setPath] = useState<DivarCategory[]>([]);
  const [draft, setDraft] = useState<DivarCategory | null>(null);
  const RowChevron = isRTL ? ChevronLeft : ChevronRight;

  const buildPath = useCallback(
    (target: DivarCategory | null): DivarCategory[] => {
      if (!target) {
        return baseCategory ? [baseCategory] : [];
      }
      const nodes: DivarCategory[] = [];
      let current: DivarCategory | null = target;
      const visited = new Set<string>();
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        nodes.unshift(current);
        if (!current.parentId) {
          break;
        }
        current = categoryStructures.byId.get(current.parentId) ?? null;
      }
      if (baseCategory && nodes.length > 0 && nodes[0].id !== baseCategory.id) {
        nodes.unshift(baseCategory);
      }
      if (nodes.length === 0 && baseCategory) {
        nodes.push(baseCategory);
      }
      return nodes;
    },
    [baseCategory, categoryStructures],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const initialSelection = selectedCategory;
    const focusCategory =
      initialSelection && !hasChildren(initialSelection, categoryStructures) && initialSelection.parentId
        ? categoryStructures.byId.get(initialSelection.parentId) ?? initialSelection
        : initialSelection ?? baseCategory ?? null;
    const initialPath = buildPath(focusCategory);
    setPath(initialPath.length > 0 ? initialPath : baseCategory ? [baseCategory] : []);
    setDraft(initialSelection && !hasChildren(initialSelection, categoryStructures) ? initialSelection : null);
  }, [open, selectedCategory, baseCategory, categoryStructures, buildPath]);

  const current = path.length > 0 ? path[path.length - 1] : null;
  const currentChildren = categoryStructures.children.get(current?.id ?? null) ?? [];

  const handleDrillDown = (category: DivarCategory) => {
    const childList = categoryStructures.children.get(category.id) ?? [];
    if (childList.length === 0) {
      setDraft(category);
      return;
    }
    setPath((prev) => [...prev, category]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setPath((prev) => prev.slice(0, index + 1));
  };

  const handleSelect = () => {
    if (draft) {
      onSelect(draft);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disableBackClose>
      <DialogContent
        hideCloseButton
        className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6"
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-4">
            <DialogHeader>
              <DialogTitle>{t('categories.title')}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {path.map((crumb, index) => (
                <div key={crumb.id} className="inline-flex items-center">
                  <button
                    type="button"
                    className={`rounded px-2 py-0.5 ${
                      index === path.length - 1 ? 'font-semibold text-foreground' : 'hover:text-foreground'
                    }`}
                    onClick={() => handleBreadcrumbClick(index)}
                  >
                    {crumb.name}
                  </button>
                  {index < path.length - 1 ? (
                    <span className="px-1 text-muted-foreground">{isRTL ? '«' : '»'}</span>
                  ) : null}
                </div>
              ))}
            </div>
            {currentChildren.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">{t('categories.empty')}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
                {path.length > 1 ? (
                  <li className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2">
                    <button
                      type="button"
                      className={cn('flex-1 text-sm font-medium text-foreground', isRTL ? 'text-right' : 'text-left')}
                      onClick={() => handleBreadcrumbClick(path.length - 2)}
                    >
                      {t('mobileBack')}
                    </button>
                    <ChevronLeft className="size-4 text-muted-foreground" />
                  </li>
                ) : null}
                {currentChildren.map((category) => {
                  const childList = categoryStructures.children.get(category.id) ?? [];
                  const isLeaf = childList.length === 0;
                  const isSelected = Boolean(
                    isLeaf &&
                      (draft?.id === category.id ||
                        (!draft && selectedCategory?.id === category.id)),
                  );
                  return (
                    <li
                      key={category.id}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2',
                        isRTL ? 'text-right' : 'text-left',
                      )}
                    >
                      <button
                        type="button"
                        className={cn(
                          'flex flex-1 items-center gap-2 text-sm justify-start',
                          isSelected ? 'font-semibold text-primary' : 'text-foreground',
                          'flex-row',
                        )}
                        onClick={() => (isLeaf ? setDraft(category) : handleDrillDown(category))}
                      >
                        {isRTL ? (
                          <>
                            <Folder className="size-4 text-muted-foreground" />
                            <span className="truncate">{category.name}</span>
                          </>
                        ) : (
                          <>
                            <Folder className="size-4 text-muted-foreground" />
                            <span className="truncate">{category.name}</span>
                          </>
                        )}
                      </button>
                      {isLeaf ? (
                        <SelectionIndicator checked={isSelected} />
                      ) : (
                        <RowChevron className="size-4 text-muted-foreground" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex gap-3 border-t border-border px-6 py-4">
            <Button type="button" className="flex-1" onClick={handleSelect} disabled={!draft}>
              {t('provinceModalConfirm')}
            </Button>
            <Button type="button" variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>
              {t('districtModalCancel')}
            </Button>
         </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
