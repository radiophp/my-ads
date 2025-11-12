/* eslint-disable tailwindcss/classnames-order */
import type { JSX } from 'react';
import {
  ArrowUpDown,
  Car,
  PanelsTopLeft,
  Warehouse,
  CheckCircle2,
  InfoIcon,
} from 'lucide-react';
import type { DivarPostSummary } from '@/types/divar-posts';
import type { AmenityConfig, DetailEntry } from '@/types/divar-posts-feed';
import type { useTranslations } from 'next-intl';

export const AMENITY_CONFIG: AmenityConfig[] = [
  { key: 'hasParking', icon: Car, labelKey: 'labels.hasParking' },
  { key: 'hasElevator', icon: ArrowUpDown, labelKey: 'labels.hasElevator' },
  { key: 'hasWarehouse', icon: Warehouse, labelKey: 'labels.hasWarehouse' },
  { key: 'hasBalcony', icon: PanelsTopLeft, labelKey: 'labels.hasBalcony' },
];

export const FEATURED_DETAIL_KEYS = ['labels.price', 'labels.pricePerSquare', 'labels.area'] as const;
export const FEATURED_RTL_ORDER: Record<string, number> = {
  'labels.price': 0,
  'labels.area': 1,
  'labels.pricePerSquare': 2,
};
const PRIMARY_PRICE_KEYS = ['labels.price', 'labels.pricePerSquare'] as const;
const RENT_PRICE_KEYS = ['labels.depositAmount', 'labels.rent'] as const;
export const INFO_ROW_KEYS = ['labels.rooms', 'labels.floor', 'labels.yearBuilt'] as const;
export const EXCLUDED_ATTRIBUTE_LABELS = new Set(['آسانسور', 'پارکینگ', 'انباری']);

export const isFeaturedDetailKey = (labelKey: string): boolean =>
  FEATURED_DETAIL_KEYS.includes(labelKey as (typeof FEATURED_DETAIL_KEYS)[number]);

export const isInfoRowKey = (labelKey: string): boolean =>
  INFO_ROW_KEYS.includes(labelKey as (typeof INFO_ROW_KEYS)[number]);

export const buildFeaturedDetailEntries = (detailEntries: DetailEntry[]): DetailEntry[] => {
  const featured = detailEntries.filter((entry) => isFeaturedDetailKey(entry.labelKey));
  const hasPrimaryPrices = featured.some((entry) =>
    PRIMARY_PRICE_KEYS.includes(entry.labelKey as (typeof PRIMARY_PRICE_KEYS)[number]),
  );
  const rentEntries = detailEntries.filter((entry) =>
    RENT_PRICE_KEYS.includes(entry.labelKey as (typeof RENT_PRICE_KEYS)[number]),
  );

  if (!hasPrimaryPrices && rentEntries.length > 0) {
    const areaEntry = featured.find((entry) => entry.labelKey === 'labels.area');
    return [...rentEntries, ...(areaEntry ? [areaEntry] : [])];
  }
  return featured;
};

export const buildInfoRowEntries = (detailEntries: DetailEntry[]): DetailEntry[] =>
  INFO_ROW_KEYS.map((key) => detailEntries.find((entry) => entry.labelKey === key)).filter(
    (entry): entry is DetailEntry => Boolean(entry),
  );

type PriceSummaryRowProps = {
  detailEntries: DetailEntry[];
  isRTL: boolean;
  entries?: DetailEntry[];
};

export function PriceSummaryRow({
  detailEntries,
  isRTL,
  entries: providedEntries,
}: PriceSummaryRowProps): JSX.Element | null {
  const entries = providedEntries ?? buildFeaturedDetailEntries(detailEntries);
  if (entries.length === 0) {
    return null;
  }

  const ordered = isRTL
    ? [...entries].sort(
        (a, b) => (FEATURED_RTL_ORDER[a.labelKey] ?? 0) - (FEATURED_RTL_ORDER[b.labelKey] ?? 0),
      )
    : entries;

  return (
    <div className="mb-4 flex w-full flex-nowrap gap-4">
      {ordered.map((entry, index) => {
        const flexClasses = index === 1 ? 'flex-1 sm:flex-[2]' : 'flex-1 sm:flex-[5]';
        return (
          <div
            key={entry.id}
            className={`flex flex-col items-center gap-2 text-center ${flexClasses}`}
          >
            <span className="text-xs text-muted-foreground">{entry.label}</span>
            <div className="rounded-full border border-input px-4 py-2">
              <span className="text-sm text-foreground">{entry.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type InfoRowsProps = {
  detailEntries: DetailEntry[];
  entries?: DetailEntry[];
};

export function InfoRowSection({
  detailEntries,
  entries: providedEntries,
}: InfoRowsProps): JSX.Element | null {
  const entries = providedEntries ?? buildInfoRowEntries(detailEntries);
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 flex w-full flex-nowrap gap-4">
      {entries.map((entry) => (
        <div key={entry.id} className="flex flex-1 flex-col items-center gap-2 text-center">
          <span className="text-xs text-muted-foreground">{entry.label}</span>
          <div className="rounded-full border border-input px-4 py-2">
            <span className="text-sm text-foreground">{entry.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

type AmenitiesSectionProps = {
  post: DivarPostSummary | null;
  t: ReturnType<typeof useTranslations>;
};

export function AmenitiesSection({ post, t }: AmenitiesSectionProps): JSX.Element | null {
  if (!post) {
    return null;
  }

  const items = AMENITY_CONFIG.map((config) => {
    const value = post[config.key];
    if (typeof value !== 'boolean') {
      return null;
    }
    if (EXCLUDED_ATTRIBUTE_LABELS.has(t(config.labelKey))) {
      return null;
    }
    return { ...config, value };
  }).filter(
    (item): item is AmenityConfig & { value: boolean } => Boolean(item && item.value !== null),
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-4">
        {items.map((amenity) => {
          const Icon = amenity.icon;
          const statusClass = amenity.value ? 'text-emerald-600' : 'text-destructive';
          const borderClass = amenity.value
            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
            : 'border-destructive bg-destructive/10 text-destructive';

          return (
            <div
              key={amenity.key}
              className="flex min-w-[70px] flex-1 flex-col items-center gap-2 text-center"
            >
              <div className={`flex size-10 items-center justify-center rounded-full border ${borderClass}`}>
                <Icon className="size-5" aria-hidden />
              </div>
              <div className={`flex items-center gap-1 text-sm ${statusClass}`}>
                <span>{t(amenity.labelKey)}</span>
                <span>{amenity.value ? t('labels.booleanYes') : t('labels.booleanNo')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type AttributeValue = { id: string; label: string; value: string };
type AttributeLabelOnly = { id: string; label: string };

export function AttributeValueGrid({ entries }: { entries: AttributeValue[] }): JSX.Element | null {
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="col-span-full">
      <div className="grid gap-4 sm:grid-cols-3">
        {entries.map((attribute) => (
          <div key={attribute.id} className="flex items-center gap-2 text-sm text-muted-foreground">
            <InfoIcon className="size-4 text-emerald-600" aria-hidden />
            <span className="text-foreground">
              {attribute.label}: {attribute.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttributeLabelGrid({
  entries,
}: {
  entries: AttributeLabelOnly[];
}): JSX.Element | null {
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="col-span-full">
      <div className="grid gap-4 sm:grid-cols-3">
        {entries.map((attribute) => (
          <div key={attribute.id} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-primary" aria-hidden />
            <span className="text-foreground">{attribute.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
