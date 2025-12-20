'use client';

import { Folder } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { DivarCategory } from '@/types/divar-category';

type Props = {
  breadcrumbItems: Array<{ slug: string | null; label: string; depth: number | null }>;
  categoryOptions: DivarCategory[];
  categorySlug: string | null;
  isRTL: boolean;
  onSelect: (slug: string | null, depth: number | null) => void;
};

export function CategoryBreadcrumb({ breadcrumbItems, categoryOptions, categorySlug, isRTL, onSelect }: Props) {
  return (
    <div className="hidden lg:block">
      <p className="text-sm font-medium text-foreground">دسته‌بندی‌ها</p>
      <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {breadcrumbItems.map((crumb, index) => {
          const isActive = crumb.slug === categorySlug;
          return (
            <div key={`${crumb.slug ?? 'root'}-${index}`} className="inline-flex items-center">
              <button
                type="button"
                className={`rounded px-1 py-0.5 ${isActive ? 'font-semibold text-foreground' : 'hover:text-foreground'}`}
                onClick={() => onSelect(crumb.slug, crumb.depth)}
              >
                {crumb.label}
              </button>
              {index < breadcrumbItems.length - 1 ? (
                <span className="px-1 text-muted-foreground">{isRTL ? '«' : '»'}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      <ul className="mt-3 flex flex-col gap-2 px-3" dir={isRTL ? 'rtl' : 'ltr'}>
        {categoryOptions.map((category) => {
          const isActive = category.slug === categorySlug;
          return (
            <li key={category.id} className="flex items-center gap-2">
              <button
                type="button"
                dir={isRTL ? 'rtl' : 'ltr'}
                onClick={() => onSelect(category.slug, category.depth)}
                className={`flex-1 text-xs transition ${
                  isActive ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'
                } ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <span
                  className={cn(
                    'inline-flex items-center gap-2',
                    isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start',
                  )}
                >
                  {isRTL ? (
                    <>
                      <span>{category.name}</span>
                      <Folder className="size-3.5 text-muted-foreground" />
                    </>
                  ) : (
                    <>
                      <Folder className="size-3.5 text-muted-foreground" />
                      <span>{category.name}</span>
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
