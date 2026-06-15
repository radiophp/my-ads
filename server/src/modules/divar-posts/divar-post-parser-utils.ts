export interface ParsedMedia {
  url: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
  position: number;
}

export interface ParsedAttribute {
  key: string;
  label?: string | null;
  type?: string | null;
  stringValue?: string | null;
  numberValue?: number | null;
  boolValue?: boolean | null;
  unit?: string | null;
  rawValue?: unknown;
}

export interface ParsedDivarPost {
  title?: string | null;
  seoTitle?: string | null;
  displayTitle?: string | null;
  displaySubtitle?: string | null;
  description?: string | null;
  seoDescription?: string | null;
  shareTitle?: string | null;
  shareUrl?: string | null;
  permalink?: string | null;
  contactUuid?: string | null;
  businessType?: string | null;
  conversionType?: string | null;
  cat1?: string | null;
  cat2?: string | null;
  cat3?: string | null;
  provinceId?: number | null;
  provinceName?: string | null;
  cityId?: number | null;
  citySlug?: string | null;
  cityName?: string | null;
  districtSlug?: string | null;
  districtName?: string | null;
  priceTotal?: number | null;
  pricePerSquare?: number | null;
  depositAmount?: number | null;
  rentAmount?: number | null;
  dailyRateNormal?: number | null;
  dailyRateWeekend?: number | null;
  dailyRateHoliday?: number | null;
  extraPersonFee?: number | null;
  area?: number | null;
  areaLabel?: string | null;
  landArea?: number | null;
  landAreaLabel?: string | null;
  rooms?: number | null;
  roomsLabel?: string | null;
  floor?: number | null;
  floorLabel?: string | null;
  floorsCount?: number | null;
  unitPerFloor?: number | null;
  yearBuilt?: number | null;
  yearBuiltLabel?: string | null;
  capacity?: number | null;
  capacityLabel?: string | null;
  hasParking?: boolean | null;
  hasElevator?: boolean | null;
  hasWarehouse?: boolean | null;
  hasBalcony?: boolean | null;
  isRebuilt?: boolean | null;
  photosVerified?: boolean | null;
  imageCount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  expiresAt?: Date | null;
  publishedAtJalali?: string | null;
  jalaliGregorianDate?: Date | null;
  relativePublishMs?: number | null;
  relativePublishText?: string | null;
  medias: ParsedMedia[];
  attributes: ParsedAttribute[];
}

export type JsonObject = Record<string, unknown>;

export type FeatureFlagKey = 'hasParking' | 'hasElevator' | 'hasWarehouse' | 'hasBalcony';

const PERSIAN_DIGITS: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

const PERSIAN_NUMBER_WORDS: Record<string, number> = {
  صفر: 0,
  یک: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
  یازده: 11,
  دوازده: 12,
  سیزده: 13,
  چهارده: 14,
  پانزده: 15,
  شانزده: 16,
  هفده: 17,
  هجده: 18,
  نوزده: 19,
  بیست: 20,
  سی: 30,
  چهل: 40,
  پنجاه: 50,
  شصت: 60,
  هفتاد: 70,
  هشتاد: 80,
  نود: 90,
  صد: 100,
  ربع: 0.25,
};

const ROOM_WORD_MAP: Record<string, number> = {
  'بدون اتاق': 0,
  یک: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
};

const JALALI_MONTHS: Record<string, number> = {
  فروردین: 1,
  اردیبهشت: 2,
  خرداد: 3,
  تیر: 4,
  مرداد: 5,
  شهریور: 6,
  مهر: 7,
  آبان: 8,
  آذر: 9,
  دی: 10,
  بهمن: 11,
  اسفند: 12,
};

const RELATIVE_UNITS_MS: Record<string, number> = {
  ثانیه: 1000,
  ثانيه: 1000,
  دقیقه: 60 * 1000,
  دقيقه: 60 * 1000,
  ساعت: 60 * 60 * 1000,
  روز: 24 * 60 * 60 * 1000,
  هفته: 7 * 24 * 60 * 60 * 1000,
  ماه: 30 * 24 * 60 * 60 * 1000,
  سال: 365 * 24 * 60 * 60 * 1000,
  ربع: 15 * 60 * 1000,
  'ربع ساعت': 15 * 60 * 1000,
  ربعساعت: 15 * 60 * 1000,
};

const normalizeLabel = (value: string): string =>
  value
    .replace(/[\u200c\u200e\u200f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const PRIMARY_GROUP_LABELS = new Set(['متراژ', 'ساخت', 'اتاق'].map(normalizeLabel));

const PRIMARY_UNEXPANDABLE_LABELS = new Set(
  [
    'تصویر‌ها برای همین ملک است؟',
    'قیمت کل',
    'قیمت هر متر',
    'طبقه',
    'ودیعه',
    'اجارهٔ ماهانه',
    'ودیعه و اجاره',
    'متراژ زمین',
    'ظرفیت',
    'آخر هفته',
    'روزهای عادی',
    'تعطیلات و مناسبت‌ها',
    'هزینهٔ هر نفرِ اضافه',
    'تعداد طبقات',
    'تعداد واحد در هر طبقه',
  ].map(normalizeLabel),
);

const FEATURE_FLAG_ENTRIES: Array<[string, FeatureFlagKey]> = [
  [normalizeLabel('آسانسور'), 'hasElevator'],
  [normalizeLabel('پارکینگ'), 'hasParking'],
  [normalizeLabel('انباری'), 'hasWarehouse'],
  [normalizeLabel('بالکن'), 'hasBalcony'],
];

const FEATURE_TITLE_FLAG_MAP = new Map<string, FeatureFlagKey>(FEATURE_FLAG_ENTRIES);

const ATTRIBUTE_LABEL_TO_KEY_ENTRIES: Array<[string, string]> = [
  [normalizeLabel('سند'), 'deed_type'],
  [normalizeLabel('جهت ساختمان'), 'building_direction'],
  [normalizeLabel('وضعیت واحد'), 'unit_condition'],
  [normalizeLabel('سیستم گرمایشی'), 'heating_system'],
  [normalizeLabel('سیستم سرمایشی'), 'cooling_system'],
  [normalizeLabel('سرویس بهداشتی'), 'toilet_type'],
  [normalizeLabel('مبدا تامین آب گرم'), 'warm_water_provider'],
  [normalizeLabel('جنس کف'), 'floor_material'],
  [normalizeLabel('نوع واحد‌ها'), 'unit_types'],
  [normalizeLabel('نوع ملک'), 'property_type'],
  [normalizeLabel('کمترین متراژ'), 'min_area'],
  [normalizeLabel('تحویل'), 'handover'],
  [normalizeLabel('سازنده'), 'builder'],
  [normalizeLabel('وضعیت فعلی پروژه'), 'project_status'],
  [normalizeLabel('پیشرفت فیزیکی کل پروژه'), 'project_progress'],
  [normalizeLabel('پیش پرداخت اولیه'), 'down_payment'],
  [normalizeLabel('پرداختی در زمان تحویل'), 'handover_payment'],
  [normalizeLabel('قیمت پایه برای هر متر مربع'), 'base_price_per_sqm'],
];

const ATTRIBUTE_LABEL_TO_KEY_MAP = new Map<string, string>(ATTRIBUTE_LABEL_TO_KEY_ENTRIES);

const BOOLEAN_TRUE_VALUES = new Set(['بله', 'بلی', 'true', 'yes', '1']);
const BOOLEAN_FALSE_VALUES = new Set(['خیر', 'false', 'no', '0']);

export function replacePersianDigits(value: string): string {
  return value
    .split('')
    .map((char) => PERSIAN_DIGITS[char] ?? char)
    .join('');
}

export function normalizePersianWord(value: string): string {
  return value
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ۀ/g, 'ه')
    .replace(/[^\u0600-\u06FF\s]/g, '')
    .replace(/[\u200c\u200e\u200f]/g, '')
    .trim();
}

export function parseNumberFromText(value?: string): number | null {
  if (!value) {
    return null;
  }

  const normalizedDigits = replacePersianDigits(value)
    .replace(/[,،]/g, '')
    .replace(/٫/g, '.')
    .replace(/[\u200c\u200e\u200f]/g, '');

  const match = normalizedDigits.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBoolean(value: string | null): boolean | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (BOOLEAN_TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (BOOLEAN_FALSE_VALUES.has(normalized)) {
    return false;
  }

  return null;
}

export function parseNumberFromUnknown(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return parseNumberFromText(value);
  }

  return null;
}

export function ensureNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return parseNumberFromText(value);
  }

  return null;
}

export function normalizeAddonServiceTag(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as JsonObject;
    const key = asString(obj['key']) ?? asString(obj['value']) ?? asString(obj['slug']) ?? null;
    if (key && key.trim().length > 0) {
      return key.trim();
    }
  }
  return null;
}

export function parseRelativeNumberToken(value: string): number | null {
  if (!value) {
    return null;
  }

  const numeric = parseNumberFromText(value);
  if (numeric !== null) {
    return numeric;
  }

  const normalizedWord = normalizePersianWord(value);
  if (!normalizedWord) {
    return null;
  }

  if (PERSIAN_NUMBER_WORDS[normalizedWord] !== undefined) {
    return PERSIAN_NUMBER_WORDS[normalizedWord];
  }

  if (normalizedWord === 'چند') {
    return 3;
  }

  if (normalizedWord === 'نیم') {
    return 0.5;
  }

  return null;
}

export function parseRoomsCount(value: string): number | null {
  const normalized = value.trim();
  const mapped = ROOM_WORD_MAP[normalized];
  if (typeof mapped === 'number') {
    return mapped;
  }

  if (normalized.includes('بدون')) {
    return 0;
  }

  return parseNumberFromText(normalized);
}

export function parseFloorValue(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === 'همکف') {
    return 0;
  }

  if (trimmed === 'زیرهمکف') {
    return -1;
  }

  return parseNumberFromText(trimmed);
}

export function deriveRebuilt(value: string): boolean | null {
  if (value.includes('بازسازی شده')) {
    return true;
  }

  if (value.includes('بازسازی نشده')) {
    return false;
  }

  return null;
}

export function asObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as JsonObject;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  return null;
}

export {
  normalizeLabel,
  PRIMARY_GROUP_LABELS,
  PRIMARY_UNEXPANDABLE_LABELS,
  FEATURE_TITLE_FLAG_MAP,
  ATTRIBUTE_LABEL_TO_KEY_MAP,
  RELATIVE_UNITS_MS,
  JALALI_MONTHS,
};
