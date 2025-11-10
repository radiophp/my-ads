import { createHash } from 'node:crypto';
import { toGregorian } from 'jalaali-js';
import { Prisma } from '@prisma/client';

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

type JsonObject = Record<string, unknown>;

type FeatureFlagKey = 'hasParking' | 'hasElevator' | 'hasWarehouse' | 'hasBalcony';

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

export class DivarPostParser {
  parse(payload: Prisma.JsonValue): ParsedDivarPost {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Divar payload must be a JSON object.');
    }

    const state = new ParserState(payload as JsonObject);
    return state.parse();
  }
}

class ParserState {
  private readonly groupValues = new Map<string, string>();
  private readonly unexpandableValues = new Map<string, string>();
  private readonly attributes: ParsedAttribute[] = [];
  private readonly medias: ParsedMedia[] = [];
  private readonly featureFlags: Partial<Record<FeatureFlagKey, boolean>> = {};
  private seoTitle?: string | null;
  private seoDescription?: string | null;
  private title?: string | null;
  private displayTitle?: string | null;
  private displaySubtitle?: string | null;
  private description?: string | null;
  private shareTitle?: string | null;
  private shareUrl?: string | null;
  private permalink?: string | null;
  private contactUuid?: string | null;
  private businessType?: string | null;
  private conversionType?: string | null;
  private priceFromWebengage?: number | null;
  private rentFromWebengage?: number | null;
  private depositFromWebengage?: number | null;
  private imageCountFromWebengage?: number | null;
  private provinceId?: number | null;
  private provinceName?: string | null;
  private cityId?: number | null;
  private citySlug?: string | null;
  private cityName?: string | null;
  private districtSlug?: string | null;
  private districtName?: string | null;
  private cat1?: string | null;
  private cat2?: string | null;
  private cat3?: string | null;
  private latitude?: number | null;
  private longitude?: number | null;
  private expiresAt?: Date | null;
  private areaFromSchema?: number | null;
  private areaLabelFromSchema?: string | null;
  private capacityValue?: number | null;
  private capacityLabel?: string | null;
  private floorsCountValue?: number | null;
  private unitPerFloorValue?: number | null;
  private yearBuiltLabel?: string | null;
  private floorLabel?: string | null;
  private photosVerified?: boolean | null;
  private isRebuilt?: boolean | null;
  private jalaliDateString?: string | null;
  private jalaliDateComponents?: { year: number; month: number; day: number } | null;
  private jalaliGregorianDate?: Date | null;
  private relativePublishMs?: number | null;
  private relativePublishText?: string | null;

  constructor(private readonly root: JsonObject) {}

  parse(): ParsedDivarPost {
    this.extractSeo();
    this.extractShare();
    this.extractContact();
    this.extractAnalytics();
    this.extractCityReference();
    this.extractWebengage();
    this.processSections();
    return this.buildResult();
  }

  private extractSeo(): void {
    const seo = this.asObject(this.root['seo']);
    if (!seo) {
      return;
    }

    this.seoTitle = this.asString(seo['title']);
    this.seoDescription = this.asString(seo['description']);
    this.extractJalaliDateComponents(this.seoTitle ?? undefined);

    const unavailable = this.asString(seo['unavailable_after']);
    if (unavailable) {
      const expires = new Date(unavailable);
      if (!Number.isNaN(expires.getTime())) {
        this.expiresAt = expires;
      }
    }

    const webInfo = this.asObject(seo['web_info']);
    if (webInfo) {
      this.title = this.asString(webInfo['title']) ?? this.title;
      this.cityName = this.cityName ?? this.asString(webInfo['city_persian']);
      this.districtName = this.districtName ?? this.asString(webInfo['district_persian']);
      if (!this.jalaliDateString) {
        this.extractJalaliDateComponents(this.title ?? undefined);
      }
    }

    const schema = this.asObject(seo['post_seo_schema']);
    if (schema) {
      this.permalink = this.asString(schema['url']) ?? this.permalink;
      const geo = this.asObject(schema['geo']);
      if (geo) {
        const latitude = this.parseNumberFromUnknown(geo['latitude']);
        const longitude = this.parseNumberFromUnknown(geo['longitude']);
        if (latitude !== null && longitude !== null) {
          this.latitude = latitude;
          this.longitude = longitude;
        }
      }

      const floorSize = this.asObject(schema['floorSize']);
      if (floorSize) {
        const value = this.asString(floorSize['value']);
        if (value) {
          this.areaFromSchema = this.parseNumberFromText(value);
          this.areaLabelFromSchema = value;
        }
      }
    }
  }

  private extractShare(): void {
    const share = this.asObject(this.root['share']);
    if (!share) {
      return;
    }

    this.shareTitle = this.asString(share['title']) ?? this.shareTitle;
    this.shareUrl = this.asString(share['web_url']) ?? this.shareUrl;
  }

  private extractContact(): void {
    const contact = this.asObject(this.root['contact']);
    if (!contact) {
      return;
    }

    this.contactUuid = this.asString(contact['contact_uuid']) ?? this.contactUuid;
  }

  private extractAnalytics(): void {
    const analytics = this.asObject(this.root['analytics']);
    if (!analytics) {
      return;
    }

    this.cat1 = this.cat1 ?? this.asString(analytics['cat1']);
    this.cat2 = this.cat2 ?? this.asString(analytics['cat2']);
    this.cat3 = this.cat3 ?? this.asString(analytics['cat3']);
    this.citySlug = this.citySlug ?? this.asString(analytics['city']);
  }

  private extractCityReference(): void {
    const city = this.asObject(this.root['city']);
    if (!city) {
      return;
    }

    const cityId = this.parseNumberFromUnknown(city['city_id']);
    if (cityId !== null) {
      this.cityId = cityId;
    }

    const provinceId = this.parseNumberFromUnknown(city['parent_id']);
    if (provinceId !== null) {
      this.provinceId = provinceId;
    }

    this.citySlug = this.citySlug ?? this.asString(city['second_slug']);
    this.cityName = this.cityName ?? this.asString(city['name']);
  }

  private extractWebengage(): void {
    const webengage = this.asObject(this.root['webengage']);
    if (!webengage) {
      return;
    }

    this.priceFromWebengage = this.ensureNumber(webengage['price']);
    this.rentFromWebengage = this.ensureNumber(webengage['rent']);
    this.depositFromWebengage = this.ensureNumber(webengage['credit']);
    this.imageCountFromWebengage = this.ensureNumber(webengage['image_count']);
    this.businessType = this.asString(webengage['business_type']) ?? this.businessType;
    this.citySlug = this.citySlug ?? this.asString(webengage['city']);
    this.districtSlug = this.districtSlug ?? this.asString(webengage['district']);
    this.cat1 = this.cat1 ?? this.asString(webengage['cat_1']);
    this.cat2 = this.cat2 ?? this.asString(webengage['cat_2']);
    const cat3 = this.asString(webengage['cat_3']) ?? this.asString(webengage['category']);
    this.cat3 = this.cat3 ?? cat3;
  }

  private processSections(): void {
    const sections = this.asArray(this.root['sections']);
    for (const section of sections) {
      const sectionObj = this.asObject(section);
      if (!sectionObj) {
        continue;
      }

      const widgets = this.asArray(sectionObj['widgets']);
      this.processWidgetList(widgets);
    }
  }

  private processWidgetList(widgets: unknown[]): void {
    for (const widget of widgets) {
      this.processWidget(widget);
    }
  }

  private processWidget(widget: unknown): void {
    const widgetObj = this.asObject(widget);
    if (!widgetObj) {
      return;
    }

    const data = this.asObject(widgetObj['data']);
    if (!data) {
      return;
    }

    const type = this.asString(data['@type']);
    switch (type) {
      case 'type.googleapis.com/widgets.GroupInfoRow':
        this.handleGroupInfoRow(data);
        break;
      case 'type.googleapis.com/widgets.UnexpandableRowData':
        this.handleUnexpandableRow(data);
        break;
      case 'type.googleapis.com/widgets.GroupFeatureRow':
        this.handleGroupFeatureRow(data);
        break;
      case 'type.googleapis.com/widgets.LegendTitleRowData': {
        this.displayTitle = this.asString(data['title']) ?? this.displayTitle;
        const subtitle = this.asString(data['subtitle']);
        if (subtitle) {
          this.displaySubtitle = subtitle;
          this.relativePublishText = subtitle;
          const relativeMs = this.parseRelativeSubtitle(subtitle);
          if (relativeMs !== null) {
            this.relativePublishMs = relativeMs;
          }
        }
        break;
      }
      case 'type.googleapis.com/widgets.DescriptionRowData':
        this.handleDescriptionRow(data);
        break;
      case 'type.googleapis.com/widgets.ImageCarouselData':
        this.handleImageCarousel(data);
        break;
      case 'type.googleapis.com/widgets.MapRowData':
        this.handleMapRow(data);
        break;
      case 'type.googleapis.com/widgets.FeatureRowData':
        this.handleFeatureRow(data);
        break;
      default:
        break;
    }

    this.processModalSources(widgetObj);
    this.processModalSources(data);
  }

  private handleGroupInfoRow(data: JsonObject): void {
    const items = this.asArray(data['items']);
    for (const rawItem of items) {
      const item = this.asObject(rawItem);
      if (!item) {
        continue;
      }

      const title = this.asString(item['title']);
      const value = this.asString(item['value']);
      if (!title || !value) {
        continue;
      }

      const key = normalizeLabel(title);
      if (!this.groupValues.has(key)) {
        this.groupValues.set(key, value);
      }

      if (!PRIMARY_GROUP_LABELS.has(key)) {
        const numberValue = this.parseNumberFromText(value);
        this.addAttribute(title, {
          stringValue: value,
          numberValue,
          type: numberValue === null ? 'string' : 'number',
        });
      }
    }
  }

  private handleUnexpandableRow(data: JsonObject): void {
    const title = this.asString(data['title']);
    const value = this.asString(data['value']);
    if (!title || !value) {
      return;
    }

    const key = normalizeLabel(title);
    if (!this.unexpandableValues.has(key)) {
      this.unexpandableValues.set(key, value);
    }

    if (key === normalizeLabel('تصویر‌ها برای همین ملک است؟')) {
      this.photosVerified = this.parseBoolean(value);
    } else if (key === normalizeLabel('ودیعه و اجاره')) {
      this.conversionType = value;
    } else if (key === normalizeLabel('ظرفیت')) {
      this.capacityLabel = value;
      this.capacityValue = this.parseNumberFromText(value);
    } else if (key === normalizeLabel('تعداد طبقات')) {
      this.floorsCountValue = this.parseNumberFromText(value);
    } else if (key === normalizeLabel('تعداد واحد در هر طبقه')) {
      this.unitPerFloorValue = this.parseNumberFromText(value);
    } else if (key === normalizeLabel('وضعیت واحد')) {
      this.isRebuilt = this.deriveRebuilt(value);
    }

    if (!PRIMARY_UNEXPANDABLE_LABELS.has(key)) {
      const numberValue = this.parseNumberFromText(value);
      this.addAttribute(title, {
        stringValue: value,
        numberValue,
        type: numberValue === null ? 'string' : 'number',
      });
    }
  }

  private handleGroupFeatureRow(data: JsonObject): void {
    const items = this.asArray(data['items']);
    for (const rawItem of items) {
      const item = this.asObject(rawItem);
      if (!item) {
        continue;
      }

      const title = this.asString(item['title']);
      if (!title) {
        continue;
      }

      const available =
        typeof item['available'] === 'boolean' ? (item['available'] as boolean) : undefined;
      const normalizedTitle = normalizeLabel(title.replace(/\s*ندارد$/u, ''));
      const hasNegativeSuffix = /ندارد$/u.test(title);
      const featureKey = FEATURE_TITLE_FLAG_MAP.get(normalizedTitle);
      const value = hasNegativeSuffix ? false : (available ?? true);
      if (featureKey) {
        this.featureFlags[featureKey] = value;
      } else {
        this.addAttribute(title, {
          stringValue: title,
          boolValue: value,
          type: 'feature',
        });
      }
    }

    const action = this.asObject(data['action']);
    if (action) {
      this.processModalAction(action);
    }
  }

  private handleDescriptionRow(data: JsonObject): void {
    const text = this.asString(data['text']);
    if (!text) {
      return;
    }

    const isPrimary = data['is_primary'] !== false;
    if (isPrimary || !this.description) {
      this.description = text;
    }
  }

  private handleImageCarousel(data: JsonObject): void {
    const items = this.asArray(data['items']);
    for (const rawItem of items) {
      const item = this.asObject(rawItem);
      if (!item) {
        continue;
      }

      const image = this.asObject(item['image']) ?? item;
      const url = this.asString(image['url']);
      if (!url) {
        continue;
      }

      this.medias.push({
        url,
        thumbnailUrl: this.asString(image['thumbnail_url']),
        alt: this.asString(image['alt']),
        position: this.medias.length,
      });
    }
  }

  private handleMapRow(data: JsonObject): void {
    const location = this.asObject(data['location']);
    if (!location) {
      return;
    }

    const exact = this.asObject(location['exact_data']);
    const approx = this.asObject(location['approx_data']);
    const point =
      this.asObject(this.asObject(exact)?.['point']) ??
      this.asObject(this.asObject(approx)?.['point']);
    if (!point) {
      return;
    }

    const latitude = this.parseNumberFromUnknown(point['latitude']);
    const longitude = this.parseNumberFromUnknown(point['longitude']);
    if (latitude !== null && longitude !== null) {
      this.latitude = latitude;
      this.longitude = longitude;
    }
  }

  private handleFeatureRow(data: JsonObject): void {
    const title = this.asString(data['title']);
    if (!title) {
      return;
    }

    this.addAttribute(title, {
      stringValue: title,
      type: 'feature',
    });
  }

  private processModalSources(source: JsonObject | undefined): void {
    if (!source) {
      return;
    }

    const action = this.asObject(source['action']);
    if (action) {
      this.processModalAction(action);
    }

    const modalPage = this.asObject(source['modal_page']);
    if (modalPage) {
      this.processModalPage(modalPage);
    }
  }

  private processModalAction(action: JsonObject): void {
    const payload = this.asObject(action['payload']);
    const modalPage = this.asObject(payload?.['modal_page'] ?? action['modal_page']);
    if (modalPage) {
      this.processModalPage(modalPage);
    }
  }

  private processModalPage(page: JsonObject): void {
    const widgets = this.asArray(page['widget_list']);
    if (widgets.length > 0) {
      this.processWidgetList(widgets);
    }
  }

  private extractJalaliDateComponents(title?: string | null): void {
    if (!title || this.jalaliDateString) {
      return;
    }

    const normalizedDigits = this.replacePersianDigits(title);
    const hyphenIndex = normalizedDigits.lastIndexOf('-');
    if (hyphenIndex === -1) {
      return;
    }

    const datePart = normalizedDigits.slice(hyphenIndex + 1).trim();
    const tokens = datePart.replace(/[،,.]/g, ' ').split(/\s+/).filter(Boolean);

    if (tokens.length < 3) {
      return;
    }

    const day = Number(tokens[0]);
    const monthKey = this.normalizePersianWord(tokens[1]);
    const year = Number(tokens[2]);
    const month = JALALI_MONTHS[monthKey];

    if (!Number.isFinite(day) || !Number.isFinite(year) || !month) {
      return;
    }

    this.jalaliDateString = `${year}-${month.toString().padStart(2, '0')}-${day
      .toString()
      .padStart(2, '0')}`;
    this.jalaliDateComponents = { year, month, day };

    try {
      const gregorian = toGregorian(year, month, day);
      if (
        Number.isFinite(gregorian.gy) &&
        Number.isFinite(gregorian.gm) &&
        Number.isFinite(gregorian.gd)
      ) {
        this.jalaliGregorianDate = new Date(Date.UTC(gregorian.gy, gregorian.gm - 1, gregorian.gd));
      }
    } catch {
      // ignore conversion failures
    }
  }

  private parseRelativeSubtitle(subtitle: string): number | null {
    if (!subtitle) {
      return null;
    }

    const markers = [' در ', ' در', 'در '];
    let relativePart = subtitle;
    for (const marker of markers) {
      const idx = subtitle.indexOf(marker);
      if (idx !== -1) {
        relativePart = subtitle.slice(0, idx);
        break;
      }
    }

    const normalizedDigits = this.replacePersianDigits(relativePart);
    const cleanedRelative = normalizedDigits.replace(/[\u200c\u200e\u200f]/g, ' ');
    const relativeMatch = cleanedRelative.match(
      /(?:(\d+(?:\.\d+)?)|([^\s]+))\s+(ثانیه|ثانيه|دقیقه|دقيقه|ساعت|روز|هفته|ماه|سال|ربع(?:\s*ساعت)?)/,
    );

    if (!relativeMatch) {
      const relativeTokens = ['لحظه', 'لحظات', 'لحظه‌ای', 'دقایقی', 'دقايقي'];
      if (relativeTokens.some((token) => cleanedRelative.includes(token))) {
        return 5 * 60 * 1000;
      }
      return null;
    }

    const rawValue = relativeMatch[1] ?? relativeMatch[2] ?? '';
    const unitKey = this.normalizePersianWord(relativeMatch[3]);
    const value = this.parseRelativeNumberToken(rawValue);
    if (value === null) {
      return null;
    }

    const sanitizedUnitKey = unitKey.replace(/\s+/g, '');
    const unitMs = RELATIVE_UNITS_MS[unitKey] ?? RELATIVE_UNITS_MS[sanitizedUnitKey];
    if (!unitMs) {
      return null;
    }

    return value * unitMs;
  }

  private parseRelativeNumberToken(value: string): number | null {
    if (!value) {
      return null;
    }

    const numeric = this.parseNumberFromText(value);
    if (numeric !== null) {
      return numeric;
    }

    const normalizedWord = this.normalizePersianWord(value);
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

  private buildResult(): ParsedDivarPost {
    const areaLabel = this.getGroupValue('متراژ') ?? this.areaLabelFromSchema ?? null;
    const area = this.parseNumberFromText(areaLabel ?? undefined) ?? this.areaFromSchema ?? null;

    const roomsLabel = this.getGroupValue('اتاق') ?? null;
    const rooms = roomsLabel ? this.parseRoomsCount(roomsLabel) : null;

    const yearBuiltLabel = this.getGroupValue('ساخت') ?? null;
    const yearBuilt = yearBuiltLabel ? this.parseNumberFromText(yearBuiltLabel) : null;

    const floorLabel = this.getUnexpandableValue('طبقه') ?? this.floorLabel ?? null;
    const floor = floorLabel ? this.parseFloorValue(floorLabel) : null;

    const landAreaLabel = this.getUnexpandableValue('متراژ زمین') ?? null;
    const landArea = landAreaLabel ? this.parseNumberFromText(landAreaLabel) : null;

    const priceLabel = this.getUnexpandableValue('قیمت کل');
    const priceTotal =
      this.parseNumberFromText(priceLabel ?? undefined) ?? this.priceFromWebengage ?? null;

    const pricePerSquareLabel = this.getUnexpandableValue('قیمت هر متر');
    const pricePerSquare = this.parseNumberFromText(pricePerSquareLabel ?? undefined) ?? null;

    const depositLabel = this.getUnexpandableValue('ودیعه');
    const depositAmount =
      this.parseNumberFromText(depositLabel ?? undefined) ?? this.depositFromWebengage ?? null;

    const rentLabel = this.getUnexpandableValue('اجارهٔ ماهانه');
    const rentAmount =
      this.parseNumberFromText(rentLabel ?? undefined) ?? this.rentFromWebengage ?? null;

    const dailyRateNormal = this.parseNumberFromText(
      this.getUnexpandableValue('روزهای عادی') ?? undefined,
    );
    const dailyRateWeekend = this.parseNumberFromText(
      this.getUnexpandableValue('آخر هفته') ?? undefined,
    );
    const dailyRateHoliday = this.parseNumberFromText(
      this.getUnexpandableValue('تعطیلات و مناسبت‌ها') ?? undefined,
    );
    const extraPersonFee = this.parseNumberFromText(
      this.getUnexpandableValue('هزینهٔ هر نفرِ اضافه') ?? undefined,
    );

    const capacityLabel = this.capacityLabel ?? this.getUnexpandableValue('ظرفیت') ?? null;
    const capacity =
      this.capacityValue ?? (capacityLabel ? this.parseNumberFromText(capacityLabel) : null);

    const floorsCount =
      this.floorsCountValue ??
      this.parseNumberFromText(this.getUnexpandableValue('تعداد طبقات') ?? undefined);
    const unitPerFloor =
      this.unitPerFloorValue ??
      this.parseNumberFromText(this.getUnexpandableValue('تعداد واحد در هر طبقه') ?? undefined);

    const result: ParsedDivarPost = {
      title: this.title ?? this.displayTitle ?? this.seoTitle ?? null,
      seoTitle: this.seoTitle ?? null,
      displayTitle: this.displayTitle ?? null,
      displaySubtitle: this.displaySubtitle ?? null,
      description: this.description ?? null,
      seoDescription: this.seoDescription ?? null,
      shareTitle: this.shareTitle ?? null,
      shareUrl: this.shareUrl ?? this.permalink ?? null,
      permalink: this.permalink ?? this.shareUrl ?? null,
      contactUuid: this.contactUuid ?? null,
      businessType: this.businessType ?? null,
      conversionType: this.conversionType ?? null,
      cat1: this.cat1 ?? null,
      cat2: this.cat2 ?? null,
      cat3: this.cat3 ?? null,
      provinceId: this.provinceId ?? null,
      provinceName: this.provinceName ?? null,
      cityId: this.cityId ?? null,
      citySlug: this.citySlug ?? null,
      cityName: this.cityName ?? null,
      districtSlug: this.districtSlug ?? null,
      districtName: this.districtName ?? null,
      priceTotal,
      pricePerSquare,
      depositAmount,
      rentAmount,
      dailyRateNormal,
      dailyRateWeekend,
      dailyRateHoliday,
      extraPersonFee,
      area,
      areaLabel,
      landArea,
      landAreaLabel,
      rooms,
      roomsLabel,
      floor,
      floorLabel,
      floorsCount,
      unitPerFloor,
      yearBuilt,
      yearBuiltLabel,
      capacity,
      capacityLabel,
      hasParking: this.featureFlags.hasParking ?? null,
      hasElevator: this.featureFlags.hasElevator ?? null,
      hasWarehouse: this.featureFlags.hasWarehouse ?? null,
      hasBalcony: this.featureFlags.hasBalcony ?? null,
      isRebuilt: this.isRebuilt ?? null,
      photosVerified: this.photosVerified ?? null,
      imageCount:
        this.imageCountFromWebengage ?? (this.medias.length > 0 ? this.medias.length : null),
      latitude: this.latitude ?? null,
      longitude: this.longitude ?? null,
      expiresAt: this.expiresAt ?? null,
      publishedAtJalali: this.jalaliDateString ?? null,
      jalaliGregorianDate: this.jalaliGregorianDate ?? null,
      relativePublishMs: this.relativePublishMs ?? null,
      relativePublishText: this.relativePublishText ?? null,
      medias: [...this.medias],
      attributes: [...this.attributes],
    };

    return result;
  }

  private parseRoomsCount(value: string): number | null {
    const normalized = value.trim();
    const mapped = ROOM_WORD_MAP[normalized];
    if (typeof mapped === 'number') {
      return mapped;
    }

    if (normalized.includes('بدون')) {
      return 0;
    }

    return this.parseNumberFromText(normalized);
  }

  private parseFloorValue(value: string): number | null {
    const trimmed = value.trim();
    if (trimmed === 'همکف') {
      return 0;
    }

    if (trimmed === 'زیرهمکف') {
      return -1;
    }

    return this.parseNumberFromText(trimmed);
  }

  private deriveRebuilt(value: string): boolean | null {
    if (value.includes('بازسازی شده')) {
      return true;
    }

    if (value.includes('بازسازی نشده')) {
      return false;
    }

    return null;
  }

  private getGroupValue(label: string): string | undefined {
    return this.groupValues.get(normalizeLabel(label));
  }

  private getUnexpandableValue(label: string): string | undefined {
    return this.unexpandableValues.get(normalizeLabel(label));
  }

  private parseBoolean(value: string | null): boolean | null {
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

  private ensureNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      return this.parseNumberFromText(value);
    }

    return null;
  }

  private parseNumberFromUnknown(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      return this.parseNumberFromText(value);
    }

    return null;
  }

  private parseNumberFromText(value?: string): number | null {
    if (!value) {
      return null;
    }

    const normalizedDigits = this.replacePersianDigits(value)
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

  private replacePersianDigits(value: string): string {
    return value
      .split('')
      .map((char) => PERSIAN_DIGITS[char] ?? char)
      .join('');
  }

  private normalizePersianWord(value: string): string {
    return value
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ۀ/g, 'ه')
      .replace(/[^\u0600-\u06FF\s]/g, '')
      .replace(/[\u200c\u200e\u200f]/g, '')
      .trim();
  }

  private addAttribute(
    label: string,
    {
      stringValue = null,
      numberValue = null,
      boolValue = null,
      type = null,
      unit = null,
      rawValue = undefined,
    }: {
      stringValue?: string | null;
      numberValue?: number | null;
      boolValue?: boolean | null;
      type?: string | null;
      unit?: string | null;
      rawValue?: unknown;
    },
  ): void {
    if (!label) {
      return;
    }

    const normalized = normalizeLabel(label);
    const mappedKey = ATTRIBUTE_LABEL_TO_KEY_MAP.get(normalized);
    const key =
      mappedKey ?? `attr_${createHash('sha1').update(normalized).digest('hex').slice(0, 10)}`;

    this.attributes.push({
      key,
      label,
      type,
      stringValue,
      numberValue,
      boolValue,
      unit,
      rawValue: rawValue ?? stringValue ?? numberValue ?? boolValue ?? null,
    });
  }

  private asObject(value: unknown): JsonObject | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as JsonObject;
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private asString(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    }

    return null;
  }
}
