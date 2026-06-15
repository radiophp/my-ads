import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toJalaali } from 'jalaali-js';

type NumericRangeInput = {
  min?: number;
  max?: number;
};

type NumberRangeFieldConfig = {
  column: keyof Prisma.DivarPostWhereInput;
  type: 'decimal' | 'int';
  transform?: 'ageToYearBuilt';
};

const NUMBER_RANGE_FIELD_MAP: Record<string, NumberRangeFieldConfig> = {
  price: { column: 'priceTotal', type: 'decimal' },
  price_per_square: { column: 'pricePerSquare', type: 'decimal' },
  rent: { column: 'rentAmount', type: 'decimal' },
  credit: { column: 'depositAmount', type: 'decimal' },
  size: { column: 'area', type: 'int' },
  floor: { column: 'floor', type: 'int' },
  floors_count: { column: 'floorsCount', type: 'int' },
  unit_per_floor: { column: 'unitPerFloor', type: 'int' },
  land_area: { column: 'landArea', type: 'int' },
  person_capacity: { column: 'capacity', type: 'int' },
  daily_rent: { column: 'dailyRateNormal', type: 'decimal' },
  'building-age': { column: 'yearBuilt', type: 'int', transform: 'ageToYearBuilt' },
};

const buildValueMap = (entries: Record<string, string>): Record<string, string> => {
  const map: Record<string, string> = {};
  Object.entries(entries).forEach(([key, label]) => {
    map[key] = label;
    map[label] = label;
  });
  return map;
};

const BUILDING_DIRECTION_VALUE_MAP = buildValueMap({
  north: 'شمالی',
  south: 'جنوبی',
  east: 'شرقی',
  west: 'غربی',
});

const COOLING_SYSTEM_VALUE_MAP = buildValueMap({
  water_cooler: 'سرمایش کولر آبی',
  air_conditioner: 'سرمایش کولر گازی',
  duct_split: 'سرمایش داکت اسپلیت',
  split: 'سرمایش اسپلیت',
  fan_coil: 'سرمایش فن کوئل',
});

const HEATING_SYSTEM_VALUE_MAP = buildValueMap({
  heater: 'گرمایش بخاری',
  shoofaj: 'گرمایش شوفاژ',
  fan_coil: 'گرمایش فن کوئل',
  floor_heating: 'گرمایش از کف',
  duct_split: 'گرمایش داکت اسپلیت',
  split: 'گرمایش اسپلیت',
  fireplace: 'گرمایش شومینه',
});

const FLOOR_TYPE_VALUE_MAP = buildValueMap({
  ceramic: 'جنس کف سرامیک',
  wood_parquet: 'جنس کف پارکت چوب',
  laminate_parquet: 'جنس کف پارکت لمینت',
  stone: 'جنس کف سنگ',
  floor_covering: 'جنس کف کفپوش PVC',
  carpet: 'جنس کف موکت',
  mosaic: 'جنس کف موزائیک',
});

const WARM_WATER_PROVIDER_VALUE_MAP = buildValueMap({
  water_heater: 'تأمین‌کننده آب گرم آبگرم‌کن',
  powerhouse: 'تأمین‌کننده آب گرم موتورخانه',
  package: 'تأمین‌کننده آب گرم پکیج',
});

const TOILET_VALUE_MAP = buildValueMap({
  squat: 'سرویس بهداشتی ایرانی',
  seat: 'سرویس بهداشتی فرنگی',
  squat_seat: 'سرویس بهداشتی ایرانی و فرنگی',
});

const DEED_TYPE_VALUE_MAP = buildValueMap({
  single_page: 'تک‌برگ',
  multi_page: 'منگوله‌دار',
  written_agreement: 'قول‌نامه‌ای',
  other: 'سایر',
});

const ROOM_FILTER_VALUE_MAP: Record<string, number | 'PLUS' | undefined> = {
  'بدون اتاق': 0,
  بدون: 0,
  یک: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  '۴': 4,
  'چهار+': 'PLUS',
  بیشتر: 'PLUS',
};

const ATTRIBUTE_STRING_FILTER_VALUE_MAP: Record<string, Record<string, string>> = {
  building_direction: BUILDING_DIRECTION_VALUE_MAP,
  cooling_system: COOLING_SYSTEM_VALUE_MAP,
  heating_system: HEATING_SYSTEM_VALUE_MAP,
  floor_type: FLOOR_TYPE_VALUE_MAP,
  warm_water_provider: WARM_WATER_PROVIDER_VALUE_MAP,
  toilet: TOILET_VALUE_MAP,
  deed_type: DEED_TYPE_VALUE_MAP,
};

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

const BUSINESS_TYPE_MAP: Record<string, string[]> = {
  personal: ['personal'],
  'real-estate-business': ['premium-panel', 'real-estate-business'],
  'premium-panel': ['premium-panel'],
};

const RECENT_AD_WINDOWS_MS: Record<string, number> = {
  '3h': 3 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

const logger = new Logger('DivarPostFilterBuilder');

export function applyCategoryFilters(
  where: Prisma.DivarPostWhereInput,
  filters: Record<string, unknown>,
): void {
  const handledKeys = new Set<string>();

  for (const [key, value] of Object.entries(filters)) {
    if (handleNumberRangeFilter(where, key, value)) {
      handledKeys.add(key);
      continue;
    }

    switch (key) {
      case 'building_direction':
      case 'cooling_system':
      case 'heating_system':
      case 'floor_type':
      case 'warm_water_provider':
      case 'toilet':
      case 'deed_type':
        handledKeys.add(key);
        applyAttributeStringFilter(where, key, value);
        break;
      case 'rooms':
        handledKeys.add(key);
        applyRoomsFilter(where, value);
        break;
      case 'bizzDeed':
        handledKeys.add(key);
        applyBizzDeedFilter(where, value);
        break;
      case 'business-type':
        handledKeys.add(key);
        applyBusinessTypeFilter(where, value);
        break;
      case 'addon_service_tags':
        handledKeys.add(key);
        applyAddonServiceTagsFilter(where, value);
        break;
      case 'recent_ads':
        handledKeys.add(key);
        applyRecentAdsFilter(where, value);
        break;
      case 'parking':
        handledKeys.add(key);
        applyBooleanColumn(where, value, 'hasParking');
        break;
      case 'elevator':
        handledKeys.add(key);
        applyBooleanColumn(where, value, 'hasElevator');
        break;
      case 'warehouse':
        handledKeys.add(key);
        applyBooleanColumn(where, value, 'hasWarehouse');
        break;
      case 'balcony':
        handledKeys.add(key);
        applyBooleanColumn(where, value, 'hasBalcony');
        break;
      case 'rebuilt':
        handledKeys.add(key);
        applyBooleanColumn(where, value, 'isRebuilt');
        break;
      case 'has-photo':
        handledKeys.add(key);
        if (value === true) {
          Object.assign(where, { imageCount: { gt: 0 } });
        }
        break;
      default:
        break;
    }
  }

  Object.keys(filters)
    .filter((key) => !handledKeys.has(key))
    .forEach((key) => logger.debug(`DivarPosts filters: unsupported or inactive key "${key}"`));
}

function handleNumberRangeFilter(
  where: Prisma.DivarPostWhereInput,
  key: string,
  value: unknown,
): boolean {
  const config = NUMBER_RANGE_FIELD_MAP[key as keyof typeof NUMBER_RANGE_FIELD_MAP];
  if (!config) {
    return false;
  }
  let normalized = normalizeClientRange(value);
  if (!normalized) {
    logger.debug(`DivarPosts filters: invalid range payload for "${key}"`);
    return true;
  }
  if (config.transform === 'ageToYearBuilt') {
    normalized = convertAgeRangeToYearBuiltRange(normalized);
    if (!normalized) {
      logger.debug(`DivarPosts filters: invalid age range for "${key}"`);
      return true;
    }
  }
  if (config.type === 'decimal') {
    const filter = buildDecimalRange(normalized);
    if (filter) {
      Object.assign(where, { [config.column]: filter as Prisma.DecimalFilter });
    }
  } else {
    const filter = buildIntRange(normalized);
    if (filter) {
      Object.assign(where, { [config.column]: filter as Prisma.IntFilter });
    }
  }
  return true;
}

function applyBusinessTypeFilter(where: Prisma.DivarPostWhereInput, value: unknown): void {
  const entries = normalizeStringArray(value);
  if (entries.length === 0) {
    return;
  }
  const resolved = new Set<string>();
  entries.forEach((entry) => {
    const mapped = BUSINESS_TYPE_MAP[entry] ?? [entry];
    mapped.forEach((item) => {
      if (item && item.length > 0) {
        resolved.add(item);
      }
    });
  });
  if (resolved.size === 0) {
    return;
  }
  Object.assign(where, { businessType: { in: Array.from(resolved) } });
}

function applyAddonServiceTagsFilter(where: Prisma.DivarPostWhereInput, value: unknown): void {
  const tags = normalizeStringArray(value);
  if (tags.length === 0) {
    return;
  }
  const condition: Prisma.DivarPostWhereInput = {
    attributes: {
      some: {
        key: 'addon_service_tags',
        stringValue: { in: tags },
      },
    },
  };
  appendAndCondition(where, condition);
}

function applyRecentAdsFilter(where: Prisma.DivarPostWhereInput, value: unknown): void {
  if (typeof value !== 'string') {
    return;
  }
  const windowMs = RECENT_AD_WINDOWS_MS[value];
  if (!windowMs) {
    return;
  }
  const threshold = new Date(Date.now() - windowMs);
  Object.assign(where, { publishedAt: { gte: threshold } });
}

function applyBooleanColumn(
  where: Prisma.DivarPostWhereInput,
  value: unknown,
  column: keyof Prisma.DivarPostWhereInput,
): void {
  if (value !== true) {
    return;
  }
  Object.assign(where, { [column]: true });
}

function applyAttributeStringFilter(
  where: Prisma.DivarPostWhereInput,
  filterKey: string,
  rawValue: unknown,
): void {
  const selections = normalizeStringArray(rawValue);
  if (selections.length === 0) {
    return;
  }
  const map = ATTRIBUTE_STRING_FILTER_VALUE_MAP[filterKey];
  const resolved = Array.from(
    new Set(
      selections
        .map((entry) => map?.[entry] ?? entry)
        .filter((entry): entry is string => entry.length > 0),
    ),
  );
  if (resolved.length === 0) {
    return;
  }
  appendAndCondition(where, {
    attributes: {
      some: {
        stringValue: { in: resolved },
      },
    },
  });
}

function applyRoomsFilter(where: Prisma.DivarPostWhereInput, rawValue: unknown): void {
  const selections = normalizeStringArray(rawValue);
  if (selections.length === 0) {
    return;
  }
  const orConditions: Prisma.DivarPostWhereInput[] = [];
  selections.forEach((selection) => {
    if (!selection) {
      return;
    }
    const normalized = selection.trim();
    if (normalized === 'بیشتر' || normalized === '+۴' || normalized === '۴+') {
      orConditions.push({
        OR: [{ rooms: { gte: 4 } }, { roomsLabel: { in: ['+۴', '۴+'] } }],
      });
      return;
    }
    if (normalized === 'بدون اتاق') {
      orConditions.push({
        OR: [
          { rooms: { equals: 0 } },
          { rooms: null, roomsLabel: 'بدون اتاق' },
          { roomsLabel: 'بدون اتاق' },
        ],
      });
      return;
    }
    const mapped = ROOM_FILTER_VALUE_MAP[normalized];
    if (mapped === 'PLUS') {
      orConditions.push({
        OR: [{ rooms: { gte: 4 } }, { roomsLabel: { in: ['+۴', '۴+'] } }],
      });
      return;
    }
    const numeric =
      typeof mapped === 'number' ? mapped : parseFiniteNumber(normalized.replace(/[^\d.-]/g, ''));
    if (numeric === null || numeric === undefined) {
      return;
    }
    const intVal = Math.trunc(numeric);
    const persian = toPersianDigits(intVal);
    const labelVariants = new Set<string>([persian, intVal.toString()]);
    if (intVal >= 4) {
      labelVariants.add(`+${persian}`);
      labelVariants.add(`${persian}+`);
    }
    orConditions.push({
      OR: [{ rooms: { equals: intVal } }, { roomsLabel: { in: Array.from(labelVariants) } }],
    });
  });
  if (orConditions.length === 0) {
    return;
  }
  appendAndCondition(where, { OR: orConditions });
}

function applyBizzDeedFilter(where: Prisma.DivarPostWhereInput, value: unknown): void {
  if (value !== true) {
    return;
  }
  const label = 'سند اداری';
  appendAndCondition(where, {
    attributes: {
      some: {
        OR: [{ key: 'bizzDeed', boolValue: true }, { label }, { stringValue: label }],
      },
    },
  });
}

function normalizeClientRange(input: unknown): NumericRangeInput | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const record = input as Record<string, unknown>;
  const min = parseFiniteNumber(record['min']);
  const max = parseFiniteNumber(record['max']);
  if (min === undefined && max === undefined) {
    return null;
  }
  return { min, max };
}

function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function buildDecimalRange(range: NumericRangeInput): Prisma.DecimalFilter | undefined {
  const filter: Prisma.DecimalFilter = {};
  if (range.min !== undefined) {
    filter.gte = new Prisma.Decimal(range.min);
  }
  if (range.max !== undefined) {
    filter.lte = new Prisma.Decimal(range.max);
  }
  return Object.keys(filter).length > 0 ? filter : undefined;
}

function buildIntRange(range: NumericRangeInput): Prisma.IntFilter | undefined {
  const filter: Prisma.IntFilter = {};
  if (range.min !== undefined) {
    filter.gte = Math.trunc(range.min);
  }
  if (range.max !== undefined) {
    filter.lte = Math.trunc(range.max);
  }
  return Object.keys(filter).length > 0 ? filter : undefined;
}

function convertAgeRangeToYearBuiltRange(range: NumericRangeInput): NumericRangeInput | null {
  const currentYear = toJalaali(new Date()).jy;
  const result: NumericRangeInput = {};
  if (range.max !== undefined) {
    const maxAge = Math.max(0, Math.trunc(range.max));
    result.min = Math.max(0, currentYear - maxAge);
  }
  if (range.min !== undefined) {
    const minAge = Math.max(0, Math.trunc(range.min));
    result.max = Math.max(0, currentYear - minAge);
  }
  if (result.min !== undefined && result.max !== undefined && result.min > result.max) {
    const temp = result.min;
    result.min = result.max;
    result.max = temp;
  }
  if (result.min === undefined && result.max === undefined) {
    return null;
  }
  return result;
}

function toPersianDigits(value: number): string {
  return value
    .toString()
    .split('')
    .map((char) => PERSIAN_DIGITS[Number(char)] ?? char)
    .join('');
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  return [];
}

function appendAndCondition(
  where: Prisma.DivarPostWhereInput,
  condition: Prisma.DivarPostWhereInput,
): void {
  if (!where.AND) {
    where.AND = [condition];
    return;
  }
  if (Array.isArray(where.AND)) {
    where.AND.push(condition);
    return;
  }
  where.AND = [where.AND, condition];
}
