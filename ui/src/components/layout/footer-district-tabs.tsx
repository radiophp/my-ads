'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Link } from '@/i18n/routing';
import { useAppSelector } from '@/lib/hooks';

type DistrictRowItem = {
  id: number;
  name: string;
  cityId?: number;
  citySlug?: string;
  provinceId?: number;
  districtId?: number;
  districtSlug?: string;
};

type DistrictRow = DistrictRowItem[];

type DistrictGroup = {
  city: string;
  cityId?: number;
  citySlug?: string;
  provinceId?: number;
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
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.accessToken));
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

  const buildDashboardHref = (params: {
    provinceId?: number;
    cityId?: number;
    districtId?: number;
  }): string => {
    const search = new URLSearchParams();
    if (typeof params.provinceId === 'number') {
      search.set('provinceId', String(params.provinceId));
    }
    if (typeof params.cityId === 'number') {
      search.set('cityId', String(params.cityId));
    }
    if (typeof params.districtId === 'number') {
      search.set('districtId', String(params.districtId));
    }
    const query = search.toString();
    return query ? `/dashboard?${query}` : '/dashboard';
  };

  const buildPreviewHref = (params: { citySlug?: string; districtSlug?: string }): string | null => {
    if (params.districtSlug) {
      return `/preview?district=${encodeURIComponent(params.districtSlug)}`;
    }
    if (params.citySlug) {
      return `/preview?city=${encodeURIComponent(params.citySlug)}`;
    }
    return null;
  };

  const resolveGroupHref = (group: DistrictGroup): string | null => {
    if (isAuthenticated) {
      if (typeof group.cityId === 'number') {
        return buildDashboardHref({ provinceId: group.provinceId, cityId: group.cityId });
      }
      return null;
    }
    return buildPreviewHref({ citySlug: group.citySlug });
  };

  const resolveItemHref = (item: DistrictRowItem): string | null => {
    if (isAuthenticated) {
      if (typeof item.districtId === 'number') {
        return buildDashboardHref({
          provinceId: item.provinceId,
          cityId: item.cityId,
          districtId: item.districtId,
        });
      }
      if (typeof item.cityId === 'number') {
        return buildDashboardHref({ provinceId: item.provinceId, cityId: item.cityId });
      }
      return null;
    }
    return buildPreviewHref({ citySlug: item.citySlug, districtSlug: item.districtSlug });
  };

  if (!activeGroup) return null;
  const activeGroupHref = resolveGroupHref(activeGroup);

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
      {activeGroupHref ? (
        <Link
          href={activeGroupHref}
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
                  {row.map((district) => {
                    const itemHref = resolveItemHref(district);
                    return (
                      <td key={district.id} className="px-3 py-2 text-muted-foreground">
                        {itemHref ? (
                          <Link
                            href={itemHref}
                            className="cursor-pointer transition hover:text-foreground"
                          >
                            {district.name}
                          </Link>
                        ) : (
                          <span>{district.name}</span>
                        )}
                      </td>
                    );
                  })}
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
