import { createHash } from 'node:crypto';
import { toGregorian } from 'jalaali-js';
import { Prisma } from '@prisma/client';
import type {
  ParsedDivarPost,
  ParsedAttribute,
  ParsedMedia,
  JsonObject,
  FeatureFlagKey,
} from './divar-post-parser-utils';
import {
  normalizeLabel,
  PRIMARY_GROUP_LABELS,
  PRIMARY_UNEXPANDABLE_LABELS,
  FEATURE_TITLE_FLAG_MAP,
  ATTRIBUTE_LABEL_TO_KEY_MAP,
  JALALI_MONTHS,
  RELATIVE_UNITS_MS,
  replacePersianDigits,
  normalizePersianWord,
  parseNumberFromText,
  parseBoolean,
  parseNumberFromUnknown,
  ensureNumber,
  normalizeAddonServiceTag,
  parseRelativeNumberToken,
  parseRoomsCount,
  parseFloorValue,
  deriveRebuilt,
  asObject,
  asArray,
  asString,
} from './divar-post-parser-utils';

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
    this.extractAddonServiceTags();
    this.processSections();
    return this.buildResult();
  }

  private extractSeo(): void {
    const seo = asObject(this.root['seo']);
    if (!seo) {
      return;
    }

    this.seoTitle = asString(seo['title']);
    this.seoDescription = asString(seo['description']);
    this.extractJalaliDateComponents(this.seoTitle ?? undefined);

    const unavailable = asString(seo['unavailable_after']);
    if (unavailable) {
      const expires = new Date(unavailable);
      if (!Number.isNaN(expires.getTime())) {
        this.expiresAt = expires;
      }
    }

    const webInfo = asObject(seo['web_info']);
    if (webInfo) {
      this.title = asString(webInfo['title']) ?? this.title;
      this.cityName = this.cityName ?? asString(webInfo['city_persian']);
      this.districtName = this.districtName ?? asString(webInfo['district_persian']);
      if (!this.jalaliDateString) {
        this.extractJalaliDateComponents(this.title ?? undefined);
      }
    }

    const schema = asObject(seo['post_seo_schema']);
    if (schema) {
      this.permalink = asString(schema['url']) ?? this.permalink;
      const geo = asObject(schema['geo']);
      if (geo) {
        const latitude = parseNumberFromUnknown(geo['latitude']);
        const longitude = parseNumberFromUnknown(geo['longitude']);
        if (latitude !== null && longitude !== null) {
          this.latitude = latitude;
          this.longitude = longitude;
        }
      }

      const floorSize = asObject(schema['floorSize']);
      if (floorSize) {
        const value = asString(floorSize['value']);
        if (value) {
          this.areaFromSchema = parseNumberFromText(value);
          this.areaLabelFromSchema = value;
        }
      }
    }
  }

  private extractShare(): void {
    const share = asObject(this.root['share']);
    if (!share) {
      return;
    }

    this.shareTitle = asString(share['title']) ?? this.shareTitle;
    this.shareUrl = asString(share['web_url']) ?? this.shareUrl;
  }

  private extractContact(): void {
    const contact = asObject(this.root['contact']);
    if (!contact) {
      return;
    }

    this.contactUuid = asString(contact['contact_uuid']) ?? this.contactUuid;
  }

  private extractAnalytics(): void {
    const analytics = asObject(this.root['analytics']);
    if (!analytics) {
      return;
    }

    this.cat1 = this.cat1 ?? asString(analytics['cat1']);
    this.cat2 = this.cat2 ?? asString(analytics['cat2']);
    this.cat3 = this.cat3 ?? asString(analytics['cat3']);
    this.citySlug = this.citySlug ?? asString(analytics['city']);
  }

  private extractCityReference(): void {
    const city = asObject(this.root['city']);
    if (!city) {
      return;
    }

    const cityId = parseNumberFromUnknown(city['city_id']);
    if (cityId !== null) {
      this.cityId = cityId;
    }

    const provinceId = parseNumberFromUnknown(city['parent_id']);
    if (provinceId !== null) {
      this.provinceId = provinceId;
    }

    this.citySlug = this.citySlug ?? asString(city['second_slug']);
    this.cityName = this.cityName ?? asString(city['name']);
  }

  private extractWebengage(): void {
    const webengage = asObject(this.root['webengage']);
    if (!webengage) {
      return;
    }

    this.priceFromWebengage = ensureNumber(webengage['price']);
    this.rentFromWebengage = ensureNumber(webengage['rent']);
    this.depositFromWebengage = ensureNumber(webengage['credit']);
    this.imageCountFromWebengage = ensureNumber(webengage['image_count']);
    this.businessType = asString(webengage['business_type']) ?? this.businessType;
    this.citySlug = this.citySlug ?? asString(webengage['city']);
    this.districtSlug = this.districtSlug ?? asString(webengage['district']);
    this.cat1 = this.cat1 ?? asString(webengage['cat_1']);
    this.cat2 = this.cat2 ?? asString(webengage['cat_2']);
    const cat3 = asString(webengage['cat_3']) ?? asString(webengage['category']);
    this.cat3 = this.cat3 ?? cat3;
  }

  private processSections(): void {
    const sections = asArray(this.root['sections']);
    for (const section of sections) {
      const sectionObj = asObject(section);
      if (!sectionObj) {
        continue;
      }

      const widgets = asArray(sectionObj['widgets']);
      this.processWidgetList(widgets);
    }
  }

  private extractAddonServiceTags(): void {
    const rawTags = this.root['addon_service_tags'];
    if (!Array.isArray(rawTags)) {
      return;
    }

    rawTags
      .map((entry) => normalizeAddonServiceTag(entry))
      .filter((tag): tag is string => Boolean(tag))
      .forEach((tag) => {
        this.attributes.push({
          key: 'addon_service_tags',
          label: 'addon_service_tags',
          type: 'addon_service',
          stringValue: tag,
          rawValue: tag,
        });
      });
  }

  private processWidgetList(widgets: unknown[], processDescription = true): void {
    for (const widget of widgets) {
      this.processWidget(widget, processDescription);
    }
  }

  private processWidget(widget: unknown, processDescription = true): void {
    const widgetObj = asObject(widget);
    if (!widgetObj) {
      return;
    }

    const data = asObject(widgetObj['data']);
    if (!data) {
      return;
    }

    const type = asString(data['@type']);
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
        this.displayTitle = asString(data['title']) ?? this.displayTitle;
        const subtitle = asString(data['subtitle']);
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
        if (processDescription) {
          this.handleDescriptionRow(data);
        }
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
    const items = asArray(data['items']);
    for (const rawItem of items) {
      const item = asObject(rawItem);
      if (!item) {
        continue;
      }

      const title = asString(item['title']);
      const value = asString(item['value']);
      if (!title || !value) {
        continue;
      }

      const key = normalizeLabel(title);
      if (!this.groupValues.has(key)) {
        this.groupValues.set(key, value);
      }

      if (!PRIMARY_GROUP_LABELS.has(key)) {
        const numberValue = parseNumberFromText(value);
        this.addAttribute(title, {
          stringValue: value,
          numberValue,
          type: numberValue === null ? 'string' : 'number',
        });
      }
    }
  }

  private handleUnexpandableRow(data: JsonObject): void {
    const title = asString(data['title']);
    const value = asString(data['value']);
    if (!title || !value) {
      return;
    }

    const key = normalizeLabel(title);
    if (!this.unexpandableValues.has(key)) {
      this.unexpandableValues.set(key, value);
    }

    if (key === normalizeLabel('تصویر‌ها برای همین ملک است؟')) {
      this.photosVerified = parseBoolean(value);
    } else if (key === normalizeLabel('ودیعه و اجاره')) {
      this.conversionType = value;
    } else if (key === normalizeLabel('ظرفیت')) {
      this.capacityLabel = value;
      this.capacityValue = parseNumberFromText(value);
    } else if (key === normalizeLabel('تعداد طبقات')) {
      this.floorsCountValue = parseNumberFromText(value);
    } else if (key === normalizeLabel('تعداد واحد در هر طبقه')) {
      this.unitPerFloorValue = parseNumberFromText(value);
    } else if (key === normalizeLabel('وضعیت واحد')) {
      this.isRebuilt = deriveRebuilt(value);
    }

    if (!PRIMARY_UNEXPANDABLE_LABELS.has(key)) {
      const numberValue = parseNumberFromText(value);
      this.addAttribute(title, {
        stringValue: value,
        numberValue,
        type: numberValue === null ? 'string' : 'number',
      });
    }
  }

  private handleGroupFeatureRow(data: JsonObject): void {
    const items = asArray(data['items']);
    for (const rawItem of items) {
      const item = asObject(rawItem);
      if (!item) {
        continue;
      }

      const title = asString(item['title']);
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

    const action = asObject(data['action']);
    if (action) {
      this.processModalAction(action);
    }
  }

  private handleDescriptionRow(data: JsonObject): void {
    const text = asString(data['text']);
    if (!text) {
      return;
    }

    const isPrimary = data['is_primary'] !== false;
    if (isPrimary || !this.description) {
      this.description = text;
    }
  }

  private handleImageCarousel(data: JsonObject): void {
    const items = asArray(data['items']);
    for (const rawItem of items) {
      const item = asObject(rawItem);
      if (!item) {
        continue;
      }

      const image = asObject(item['image']) ?? item;
      const url = asString(image['url']);
      if (!url) {
        continue;
      }

      this.medias.push({
        url,
        thumbnailUrl: asString(image['thumbnail_url']),
        alt: asString(image['alt']),
        position: this.medias.length,
      });
    }
  }

  private handleMapRow(data: JsonObject): void {
    const location = asObject(data['location']);
    if (!location) {
      return;
    }

    const exact = asObject(location['exact_data']);
    const approx = asObject(location['approx_data']);
    const point = asObject(asObject(exact)?.['point']) ?? asObject(asObject(approx)?.['point']);
    if (!point) {
      return;
    }

    const latitude = parseNumberFromUnknown(point['latitude']);
    const longitude = parseNumberFromUnknown(point['longitude']);
    if (latitude !== null && longitude !== null) {
      this.latitude = latitude;
      this.longitude = longitude;
    }
  }

  private handleFeatureRow(data: JsonObject): void {
    const title = asString(data['title']);
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

    const action = asObject(source['action']);
    if (action) {
      this.processModalAction(action);
    }

    const modalPage = asObject(source['modal_page']);
    if (modalPage) {
      this.processModalPage(modalPage);
    }
  }

  private processModalAction(action: JsonObject): void {
    const payload = asObject(action['payload']);
    const modalPage = asObject(payload?.['modal_page'] ?? action['modal_page']);
    if (modalPage) {
      this.processModalPage(modalPage);
    }
  }

  private processModalPage(page: JsonObject): void {
    const widgets = asArray(page['widget_list']);
    if (widgets.length > 0) {
      this.processWidgetList(widgets, false);
    }
  }

  private extractJalaliDateComponents(title?: string | null): void {
    if (!title || this.jalaliDateString) {
      return;
    }

    const normalizedDigits = replacePersianDigits(title);
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
    const monthKey = normalizePersianWord(tokens[1]);
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

    const normalizedDigits = replacePersianDigits(relativePart);
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
    const unitKey = normalizePersianWord(relativeMatch[3]);
    const value = parseRelativeNumberToken(rawValue);
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

  private buildResult(): ParsedDivarPost {
    const areaLabel = this.getGroupValue('متراژ') ?? this.areaLabelFromSchema ?? null;
    const area = parseNumberFromText(areaLabel ?? undefined) ?? this.areaFromSchema ?? null;

    const roomsLabel = this.getGroupValue('اتاق') ?? null;
    const rooms = roomsLabel ? parseRoomsCount(roomsLabel) : null;

    const yearBuiltLabel = this.getGroupValue('ساخت') ?? null;
    const yearBuilt = yearBuiltLabel ? parseNumberFromText(yearBuiltLabel) : null;

    const floorLabel = this.getUnexpandableValue('طبقه') ?? this.floorLabel ?? null;
    const floor = floorLabel ? parseFloorValue(floorLabel) : null;

    const landAreaLabel = this.getUnexpandableValue('متراژ زمین') ?? null;
    const landArea = landAreaLabel ? parseNumberFromText(landAreaLabel) : null;

    const priceLabel = this.getUnexpandableValue('قیمت کل');
    const priceTotal =
      parseNumberFromText(priceLabel ?? undefined) ?? this.priceFromWebengage ?? null;

    const pricePerSquareLabel = this.getUnexpandableValue('قیمت هر متر');
    const pricePerSquare = parseNumberFromText(pricePerSquareLabel ?? undefined) ?? null;

    const depositLabel = this.getUnexpandableValue('ودیعه');
    const depositAmount =
      parseNumberFromText(depositLabel ?? undefined) ?? this.depositFromWebengage ?? null;

    const rentLabel = this.getUnexpandableValue('اجارهٔ ماهانه');
    const rentAmount =
      parseNumberFromText(rentLabel ?? undefined) ?? this.rentFromWebengage ?? null;

    const dailyRateNormal = parseNumberFromText(
      this.getUnexpandableValue('روزهای عادی') ?? undefined,
    );
    const dailyRateWeekend = parseNumberFromText(
      this.getUnexpandableValue('آخر هفته') ?? undefined,
    );
    const dailyRateHoliday = parseNumberFromText(
      this.getUnexpandableValue('تعطیلات و مناسبت‌ها') ?? undefined,
    );
    const extraPersonFee = parseNumberFromText(
      this.getUnexpandableValue('هزینهٔ هر نفرِ اضافه') ?? undefined,
    );

    const capacityLabel = this.capacityLabel ?? this.getUnexpandableValue('ظرفیت') ?? null;
    const capacity =
      this.capacityValue ?? (capacityLabel ? parseNumberFromText(capacityLabel) : null);

    const floorsCount =
      this.floorsCountValue ??
      parseNumberFromText(this.getUnexpandableValue('تعداد طبقات') ?? undefined);
    const unitPerFloor =
      this.unitPerFloorValue ??
      parseNumberFromText(this.getUnexpandableValue('تعداد واحد در هر طبقه') ?? undefined);

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

  private getGroupValue(label: string): string | undefined {
    return this.groupValues.get(normalizeLabel(label));
  }

  private getUnexpandableValue(label: string): string | undefined {
    return this.unexpandableValues.get(normalizeLabel(label));
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
}
