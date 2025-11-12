import type { DivarPostSummary } from '@/types/divar-posts';
import type { DetailEntry } from '@/types/divar-posts-feed';
import type { useTranslations } from 'next-intl';
import { buildFeaturedDetailEntries, buildInfoRowEntries } from './post-detail-sections';

export type AttributeValueEntry = { id: string; label: string; value: string };
export type AttributeLabelEntry = { id: string; label: string };

export type PostDetailData = {
  detailEntries: DetailEntry[];
  featuredDetailEntries: DetailEntry[];
  infoRowEntries: DetailEntry[];
  secondaryDetailEntries: DetailEntry[];
  attributeValueEntries: AttributeValueEntry[];
  attributeLabelOnlyEntries: AttributeLabelEntry[];
  descriptionLines: string[] | null;
};

export type BuildPostDetailDataArgs = {
  post: DivarPostSummary;
  t: ReturnType<typeof useTranslations>;
  formatPrice: (value: number | null | undefined) => string | null;
  numberFormatter: Intl.NumberFormat;
};

export function buildPostDetailData({
  post,
  t,
  formatPrice,
  numberFormatter,
}: BuildPostDetailDataArgs): PostDetailData {
  const detailEntries: DetailEntry[] = [];
  const attributeValueEntries: AttributeValueEntry[] = [];
  const attributeLabelOnlyEntries: AttributeLabelEntry[] = [];
  let counter = 0;

  const addEntry = (labelKey: string, value?: string | null) => {
    if (!value || value.trim().length === 0) {
      return;
    }
    detailEntries.push({
      id: `${labelKey}-${counter++}`,
      labelKey,
      label: t(labelKey),
      value: value.trim(),
    });
  };

  const addPriceEntry = (labelKey: string, amount?: number | null) => {
    const formatted = formatPrice(amount ?? null);
    if (formatted) {
      addEntry(labelKey, formatted);
    }
  };

  const formatLabeledValue = (
    labelValue?: string | null,
    numericValue?: number | null,
    fallback?: (value: number) => string,
  ): string | null => {
    const trimmed = labelValue?.trim();
    if (trimmed) {
      return trimmed;
    }
    if (typeof numericValue === 'number' && !Number.isNaN(numericValue)) {
      return fallback ? fallback(numericValue) : numberFormatter.format(numericValue);
    }
    return null;
  };

  addPriceEntry('labels.price', post.priceTotal);
  addPriceEntry('labels.pricePerSquare', post.pricePerSquare);
  addPriceEntry('labels.depositAmount', post.depositAmount);
  addPriceEntry('labels.rent', post.rentAmount);
  addPriceEntry('labels.dailyRateNormal', post.dailyRateNormal);
  addPriceEntry('labels.dailyRateWeekend', post.dailyRateWeekend);
  addPriceEntry('labels.dailyRateHoliday', post.dailyRateHoliday);
  addPriceEntry('labels.extraPersonFee', post.extraPersonFee);

  addEntry(
    'labels.area',
    formatLabeledValue(post.areaLabel, post.area, (value) => t('areaLabel', { value })),
  );
  addEntry('labels.landArea', formatLabeledValue(post.landAreaLabel, post.landArea));
  addEntry('labels.rooms', formatLabeledValue(post.roomsLabel, post.rooms));
  addEntry('labels.floor', formatLabeledValue(post.floorLabel, post.floor));
  addEntry('labels.floorsCount', formatLabeledValue(null, post.floorsCount));
  addEntry('labels.unitPerFloor', formatLabeledValue(null, post.unitPerFloor));
  addEntry('labels.yearBuilt', formatLabeledValue(post.yearBuiltLabel, post.yearBuilt));
  addEntry('labels.capacity', formatLabeledValue(post.capacityLabel, post.capacity));

  const seenValueKeys = new Set<string>();
  const seenLabelOnly = new Set<string>();

  post.attributes?.forEach((attribute, index) => {
    const label = attribute.label?.trim() || attribute.key;
    const value = attribute.stringValue?.trim();
    if (!label || !value) {
      return;
    }
    const id = attribute.id ?? `${attribute.key}-${index}`;
    const isLabelOnly = label === value;
    if (isLabelOnly) {
      if (!seenLabelOnly.has(label)) {
        attributeLabelOnlyEntries.push({ id, label });
        seenLabelOnly.add(label);
      }
      return;
    }
    const key = `${label}|${value}`;
    if (seenValueKeys.has(key)) {
      return;
    }
    seenValueKeys.add(key);
    attributeValueEntries.push({ id, label, value });
  });

  if (typeof post.isRebuilt === 'boolean') {
    const rebuildLabel = `${t('labels.isRebuilt')} ${
      post.isRebuilt ? t('labels.booleanYes') : t('labels.booleanNo')
    }`;
    if (!seenLabelOnly.has(rebuildLabel)) {
      attributeLabelOnlyEntries.push({ id: 'detail-isRebuilt', label: rebuildLabel });
      seenLabelOnly.add(rebuildLabel);
    }
  }

  attributeLabelOnlyEntries.sort((a, b) => a.label.length - b.label.length);

  const descriptionLines = post.description ? post.description.split('\n') : null;

  const featuredDetailEntries = buildFeaturedDetailEntries(detailEntries);
  const infoRowEntries = buildInfoRowEntries(detailEntries);
  const featuredKeys = new Set(featuredDetailEntries.map((entry) => entry.labelKey));
  const infoKeys = new Set(infoRowEntries.map((entry) => entry.labelKey));
  const secondaryDetailEntries = detailEntries.filter(
    (entry) => !featuredKeys.has(entry.labelKey) && !infoKeys.has(entry.labelKey),
  );

  return {
    detailEntries,
    featuredDetailEntries,
    infoRowEntries,
    secondaryDetailEntries,
    attributeValueEntries,
    attributeLabelOnlyEntries,
    descriptionLines,
  };
}
