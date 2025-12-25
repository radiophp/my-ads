'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Link } from '@/i18n/routing';

type DistrictRowItem = { id: number; name: string; href?: string };

type DistrictRow = DistrictRowItem[];

type DistrictGroup = {
  city: string;
  href?: string;
  items: DistrictRowItem[];
};

type FooterDistrictTabsProps = {
  groups: DistrictGroup[];
  emptyLabel?: string;
  defaultCity?: string;
};

const LARGE_COLUMN_COUNT = 6;
const TABLET_COLUMN_COUNT = 4;

export function FooterDistrictTabs({ groups, emptyLabel, defaultCity }: FooterDistrictTabsProps) {
  const resolveDefaultIndex = useCallback((): number => {
    if (!defaultCity) return 0;
    const matchIndex = groups.findIndex((group) => group.city === defaultCity);
    return matchIndex >= 0 ? matchIndex : 0;
  }, [defaultCity, groups]);
  const defaultIndex = useMemo(() => resolveDefaultIndex(), [resolveDefaultIndex]);
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const [columnCount, setColumnCount] = useState(LARGE_COLUMN_COUNT);

  useEffect(() => {
    if (groups.length === 0) return;
    setActiveIndex((current) => {
      if (current < 0 || current >= groups.length) {
        return defaultIndex;
      }
      return current;
    });
  }, [defaultIndex, groups.length]);

  useEffect(() => {
    const lgQuery = window.matchMedia('(min-width: 1024px)');
    const updateCount = () =>
      setColumnCount(lgQuery.matches ? LARGE_COLUMN_COUNT : TABLET_COLUMN_COUNT);
    updateCount();
    lgQuery.addEventListener('change', updateCount);
    return () => {
      lgQuery.removeEventListener('change', updateCount);
    };
  }, []);

  const activeGroup = groups[activeIndex];
  const rows = useMemo(() => {
    if (!activeGroup) return [];
    const result: DistrictRow[] = [];
    for (let i = 0; i < activeGroup.items.length; i += columnCount) {
      result.push(activeGroup.items.slice(i, i + columnCount));
    }
    return result;
  }, [activeGroup, columnCount]);

  if (!activeGroup) return null;

  return (
    <div className="mt-4 flex flex-col gap-4 text-xs text-muted-foreground">
      <div className="flex w-full flex-nowrap overflow-x-auto border border-border/60">
        {groups.map((group, index) => (
          <button
            key={group.city}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={cn(
              'flex w-32 flex-none items-center justify-center gap-1 px-4 py-2 text-xs transition',
              index === activeIndex
                ? 'bg-primary/10 text-foreground'
                : 'bg-muted/20 text-muted-foreground hover:text-foreground',
              index !== groups.length - 1 ? 'border-l border-border/60' : null,
            )}
          >
            <MapPin className="size-3.5" aria-hidden />
            <span>{group.city}</span>
          </button>
        ))}
      </div>
      {activeGroup.href ? (
        <Link
          href={activeGroup.href}
          className="w-fit text-xs font-medium text-foreground underline-offset-2 transition hover:underline"
        >
          {activeGroup.city}
        </Link>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={`${activeGroup.city}-row-${rowIndex}`}
                  className="border-b border-border/60 last:border-b-0"
                >
                  {row.map((district) => (
                    <td key={district.id} className="px-3 py-2 text-muted-foreground">
                      {district.href ? (
                        <Link
                          href={district.href}
                          className="cursor-pointer transition hover:text-foreground"
                        >
                          {district.name}
                        </Link>
                      ) : (
                        <span>{district.name}</span>
                      )}
                    </td>
                  ))}
                  {row.length < columnCount
                    ? Array.from({ length: columnCount - row.length }).map((_, emptyIndex) => (
                        <td key={`empty-${emptyIndex}`} className="px-3 py-2 text-transparent">
                          .
                        </td>
                      ))
                    : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
