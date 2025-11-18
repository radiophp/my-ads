import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import { PostAnalysisStatus, Prisma } from '@prisma/client';
import type { PaginatedPostsToAnalyzeDto, PostToAnalyzeItemDto } from './dto/post-to-analyze.dto';
import type { PaginatedDivarPostsDto, DivarPostListItemDto } from './dto/divar-post.dto';
import { toJalaali } from 'jalaali-js';

const PAGE_SIZE_LIMIT = 100;

const DIVAR_POST_SUMMARY_SELECT = {
  id: true,
  externalId: true,
  title: true,
  displayTitle: true,
  seoTitle: true,
  description: true,
  priceTotal: true,
  rentAmount: true,
  depositAmount: true,
  dailyRateNormal: true,
  dailyRateWeekend: true,
  dailyRateHoliday: true,
  extraPersonFee: true,
  pricePerSquare: true,
  area: true,
  areaLabel: true,
  landArea: true,
  landAreaLabel: true,
  rooms: true,
  roomsLabel: true,
  floor: true,
  floorLabel: true,
  floorsCount: true,
  unitPerFloor: true,
  yearBuilt: true,
  yearBuiltLabel: true,
  capacity: true,
  capacityLabel: true,
  hasParking: true,
  hasElevator: true,
  hasWarehouse: true,
  hasBalcony: true,
  isRebuilt: true,
  photosVerified: true,
  cityName: true,
  districtName: true,
  provinceName: true,
  categorySlug: true,
  businessType: true,
  publishedAt: true,
  publishedAtJalali: true,
  createdAt: true,
  permalink: true,
  medias: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      url: true,
      localUrl: true,
      thumbnailUrl: true,
      localThumbnailUrl: true,
      alt: true,
    },
  },
  attributes: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      key: true,
      label: true,
      type: true,
      stringValue: true,
      numberValue: true,
      boolValue: true,
      unit: true,
      rawValue: true,
    },
  },
} satisfies Prisma.DivarPostSelect;

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

type NumericRangeInput = {
  min?: number;
  max?: number;
};

@Injectable()
export class DivarPostsAdminService {
  private readonly logger = new Logger(DivarPostsAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listPostsToAnalyze(
    page: number,
    pageSize = PAGE_SIZE_LIMIT,
  ): Promise<PaginatedPostsToAnalyzeDto> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const take = Math.min(Math.max(Number(pageSize) || PAGE_SIZE_LIMIT, 1), PAGE_SIZE_LIMIT);
    const skip = (safePage - 1) * take;

    const where: Prisma.PostToAnalyzeQueueWhereInput = {
      status: PostAnalysisStatus.PENDING,
    };

    const [records, totalItems] = await Promise.all([
      this.prisma.postToAnalyzeQueue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.postToAnalyzeQueue.count({ where }),
    ]);

    const items: PostToAnalyzeItemDto[] = records.map((record) => ({
      id: record.id,
      readQueueId: record.readQueueId,
      externalId: record.externalId,
      source: record.source,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      payload: record.payload,
      seoTitle: this.extractSeoTitle(record.payload),
    }));

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / take);
    const hasPreviousPage = safePage > 1;
    const hasNextPage = totalPages === 0 ? false : safePage < totalPages;

    return {
      items,
      meta: {
        page: safePage,
        pageSize: take,
        totalItems,
        totalPages,
        hasPreviousPage,
        hasNextPage,
      },
    };
  }

  async listNormalizedPosts(
    options: {
      cursor?: string;
      limit?: number;
      provinceId?: number;
      cityIds?: number[];
      districtIds?: number[];
      categorySlug?: string;
      categoryDepth?: number;
      filters?: Record<string, unknown>;
      ringFolderId?: string;
      userId?: string | null;
      noteFilter?: 'has' | 'none';
    } = {},
  ): Promise<PaginatedDivarPostsDto> {
    const take = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const where: Prisma.DivarPostWhereInput = {};
    if (typeof options.provinceId === 'number') {
      where.provinceId = options.provinceId;
    }
    if (options.cityIds && options.cityIds.length > 0) {
      where.cityId = { in: options.cityIds };
    }
    if (options.districtIds && options.districtIds.length > 0) {
      where.districtId = { in: options.districtIds };
    }
    if (options.categorySlug) {
      where.OR = [
        { categorySlug: options.categorySlug },
        { cat3: options.categorySlug },
        { cat2: options.categorySlug },
        { cat1: options.categorySlug },
      ];
    }
    if (options.filters) {
      this.applyCategoryFilters(where, options.filters);
    }
    if (options.ringFolderId) {
      if (!options.userId) {
        throw new BadRequestException('Ring binder filter requires authentication.');
      }
      const folder = await this.prisma.ringBinderFolder.findFirst({
        where: {
          id: options.ringFolderId,
          userId: options.userId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!folder) {
        return {
          items: [],
          nextCursor: null,
          hasMore: false,
        };
      }
      this.appendAndCondition(where, {
        savedInFolders: {
          some: {
            folderId: folder.id,
          },
        },
      });
    }
    if (options.noteFilter) {
      if (!options.userId) {
        throw new BadRequestException('Note filter requires authentication.');
      }
      const condition =
        options.noteFilter === 'has'
          ? {
              notes: {
                some: {
                  userId: options.userId,
                },
              },
            }
          : {
              notes: {
                none: {
                  userId: options.userId,
                },
              },
            };
      this.appendAndCondition(where, condition);
    }
    const queryArgs = {
      orderBy: [
        { publishedAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      select: DIVAR_POST_SUMMARY_SELECT,
      take: take + 1,
      where,
      ...(options.cursor
        ? {
            skip: 1,
            cursor: { id: options.cursor },
          }
        : {}),
    } satisfies Prisma.DivarPostFindManyArgs;

    this.logger.debug(
      `DivarPosts query -> where: ${JSON.stringify(queryArgs.where)}, cursor: ${
        options.cursor
      }, limit: ${options.limit}, filters: ${options.filters ? JSON.stringify(options.filters) : 'none'}`,
    );

    const records = await this.prisma.divarPost.findMany(queryArgs);
    const hasMore = records.length > take;
    const items = hasMore ? records.slice(0, take) : records;

    return {
      items: items.map((record) => this.mapRecordToListItem(record)),
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  async getPostWithMedias(id: string): Promise<{
    id: string;
    externalId: string | null;
    title: string | null;
    medias: { id: string; url: string | null; localUrl: string | null }[];
  } | null> {
    return this.prisma.divarPost.findUnique({
      where: { id },
      select: {
        id: true,
        externalId: true,
        title: true,
        medias: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            url: true,
            localUrl: true,
          },
        },
      },
    });
  }

  async getNormalizedPostById(id: string): Promise<DivarPostListItemDto | null> {
    const record = await this.prisma.divarPost.findUnique({
      where: { id },
      select: DIVAR_POST_SUMMARY_SELECT,
    });
    if (!record) {
      return null;
    }
    return this.mapRecordToListItem(record);
  }

  private applyCategoryFilters(
    where: Prisma.DivarPostWhereInput,
    filters: Record<string, unknown>,
  ): void {
    const handledKeys = new Set<string>();

    for (const [key, value] of Object.entries(filters)) {
      if (this.handleNumberRangeFilter(where, key, value)) {
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
          this.applyAttributeStringFilter(where, key, value);
          break;
        case 'rooms':
          handledKeys.add(key);
          this.applyRoomsFilter(where, value);
          break;
        case 'bizzDeed':
          handledKeys.add(key);
          this.applyBizzDeedFilter(where, value);
          break;
        case 'business-type':
          handledKeys.add(key);
          this.applyBusinessTypeFilter(where, value);
          break;
        case 'addon_service_tags':
          handledKeys.add(key);
          this.applyAddonServiceTagsFilter(where, value);
          break;
        case 'recent_ads':
          handledKeys.add(key);
          this.applyRecentAdsFilter(where, value);
          break;
        case 'parking':
          handledKeys.add(key);
          this.applyBooleanColumn(where, value, 'hasParking');
          break;
        case 'elevator':
          handledKeys.add(key);
          this.applyBooleanColumn(where, value, 'hasElevator');
          break;
        case 'warehouse':
          handledKeys.add(key);
          this.applyBooleanColumn(where, value, 'hasWarehouse');
          break;
        case 'balcony':
          handledKeys.add(key);
          this.applyBooleanColumn(where, value, 'hasBalcony');
          break;
        case 'rebuilt':
          handledKeys.add(key);
          this.applyBooleanColumn(where, value, 'isRebuilt');
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
      .forEach((key) =>
        this.logger.debug(`DivarPosts filters: unsupported or inactive key "${key}"`),
      );
  }

  private handleNumberRangeFilter(
    where: Prisma.DivarPostWhereInput,
    key: string,
    value: unknown,
  ): boolean {
    const config = NUMBER_RANGE_FIELD_MAP[key as keyof typeof NUMBER_RANGE_FIELD_MAP];
    if (!config) {
      return false;
    }
    let normalized = this.normalizeClientRange(value);
    if (!normalized) {
      this.logger.debug(`DivarPosts filters: invalid range payload for "${key}"`);
      return true;
    }
    if (config.transform === 'ageToYearBuilt') {
      normalized = this.convertAgeRangeToYearBuiltRange(normalized);
      if (!normalized) {
        this.logger.debug(`DivarPosts filters: invalid age range for "${key}"`);
        return true;
      }
    }
    if (config.type === 'decimal') {
      const filter = this.buildDecimalRange(normalized);
      if (filter) {
        Object.assign(where, { [config.column]: filter as Prisma.DecimalFilter });
      }
    } else {
      const filter = this.buildIntRange(normalized);
      if (filter) {
        Object.assign(where, { [config.column]: filter as Prisma.IntFilter });
      }
    }
    return true;
  }

  private applyBusinessTypeFilter(where: Prisma.DivarPostWhereInput, value: unknown): void {
    const entries = this.normalizeStringArray(value);
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

  private applyAddonServiceTagsFilter(where: Prisma.DivarPostWhereInput, value: unknown): void {
    const tags = this.normalizeStringArray(value);
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
    this.appendAndCondition(where, condition);
  }

  private applyRecentAdsFilter(where: Prisma.DivarPostWhereInput, value: unknown): void {
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

  private applyBooleanColumn(
    where: Prisma.DivarPostWhereInput,
    value: unknown,
    column: keyof Prisma.DivarPostWhereInput,
  ): void {
    if (value !== true) {
      return;
    }
    Object.assign(where, { [column]: true });
  }

  private applyAttributeStringFilter(
    where: Prisma.DivarPostWhereInput,
    filterKey: string,
    rawValue: unknown,
  ): void {
    const selections = this.normalizeStringArray(rawValue);
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
    this.appendAndCondition(where, {
      attributes: {
        some: {
          stringValue: { in: resolved },
        },
      },
    });
  }

  private applyRoomsFilter(where: Prisma.DivarPostWhereInput, rawValue: unknown): void {
    const selections = this.normalizeStringArray(rawValue);
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
        typeof mapped === 'number'
          ? mapped
          : this.parseFiniteNumber(normalized.replace(/[^\d.-]/g, ''));
      if (numeric === null || numeric === undefined) {
        return;
      }
      const intVal = Math.trunc(numeric);
      const persian = this.toPersianDigits(intVal);
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
    this.appendAndCondition(where, { OR: orConditions });
  }

  private applyBizzDeedFilter(where: Prisma.DivarPostWhereInput, value: unknown): void {
    if (value !== true) {
      return;
    }
    const label = 'سند اداری';
    this.appendAndCondition(where, {
      attributes: {
        some: {
          OR: [{ key: 'bizzDeed', boolValue: true }, { label }, { stringValue: label }],
        },
      },
    });
  }

  private normalizeClientRange(input: unknown): NumericRangeInput | null {
    if (!input || typeof input !== 'object') {
      return null;
    }
    const record = input as Record<string, unknown>;
    const min = this.parseFiniteNumber(record['min']);
    const max = this.parseFiniteNumber(record['max']);
    if (min === undefined && max === undefined) {
      return null;
    }
    return { min, max };
  }

  private parseFiniteNumber(value: unknown): number | undefined {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      return undefined;
    }
    return value;
  }

  private buildDecimalRange(range: NumericRangeInput): Prisma.DecimalFilter | undefined {
    const filter: Prisma.DecimalFilter = {};
    if (range.min !== undefined) {
      filter.gte = new Prisma.Decimal(range.min);
    }
    if (range.max !== undefined) {
      filter.lte = new Prisma.Decimal(range.max);
    }
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  private buildIntRange(range: NumericRangeInput): Prisma.IntFilter | undefined {
    const filter: Prisma.IntFilter = {};
    if (range.min !== undefined) {
      filter.gte = Math.trunc(range.min);
    }
    if (range.max !== undefined) {
      filter.lte = Math.trunc(range.max);
    }
    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  private convertAgeRangeToYearBuiltRange(range: NumericRangeInput): NumericRangeInput | null {
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

  private toPersianDigits(value: number): string {
    return value
      .toString()
      .split('')
      .map((char) => PERSIAN_DIGITS[Number(char)] ?? char)
      .join('');
  }

  private normalizeStringArray(value: unknown): string[] {
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

  private appendAndCondition(
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

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  private mapRecordToListItem(record: DivarPostSummaryRecord): DivarPostListItemDto {
    return {
      id: record.id,
      externalId: record.externalId ?? '',
      title: record.title ?? record.displayTitle ?? record.seoTitle ?? null,
      description: record.description ?? null,
      priceTotal:
        record.priceTotal !== null && record.priceTotal !== undefined
          ? Number(record.priceTotal)
          : null,
      rentAmount:
        record.rentAmount !== null && record.rentAmount !== undefined
          ? Number(record.rentAmount)
          : null,
      depositAmount:
        record.depositAmount !== null && record.depositAmount !== undefined
          ? Number(record.depositAmount)
          : null,
      dailyRateNormal:
        record.dailyRateNormal !== null && record.dailyRateNormal !== undefined
          ? Number(record.dailyRateNormal)
          : null,
      dailyRateWeekend:
        record.dailyRateWeekend !== null && record.dailyRateWeekend !== undefined
          ? Number(record.dailyRateWeekend)
          : null,
      dailyRateHoliday:
        record.dailyRateHoliday !== null && record.dailyRateHoliday !== undefined
          ? Number(record.dailyRateHoliday)
          : null,
      extraPersonFee:
        record.extraPersonFee !== null && record.extraPersonFee !== undefined
          ? Number(record.extraPersonFee)
          : null,
      pricePerSquare:
        record.pricePerSquare !== null && record.pricePerSquare !== undefined
          ? Number(record.pricePerSquare)
          : null,
      area: record.area ?? null,
      areaLabel: record.areaLabel ?? null,
      landArea: record.landArea ?? null,
      landAreaLabel: record.landAreaLabel ?? null,
      rooms: record.rooms ?? null,
      roomsLabel: record.roomsLabel ?? null,
      floor: record.floor ?? null,
      floorLabel: record.floorLabel ?? null,
      floorsCount: record.floorsCount ?? null,
      unitPerFloor: record.unitPerFloor ?? null,
      yearBuilt: record.yearBuilt ?? null,
      yearBuiltLabel: record.yearBuiltLabel ?? null,
      capacity: record.capacity ?? null,
      capacityLabel: record.capacityLabel ?? null,
      hasParking: record.hasParking ?? null,
      hasElevator: record.hasElevator ?? null,
      hasWarehouse: record.hasWarehouse ?? null,
      hasBalcony: record.hasBalcony ?? null,
      isRebuilt: record.isRebuilt ?? null,
      photosVerified: record.photosVerified ?? null,
      cityName: record.cityName ?? null,
      districtName: record.districtName ?? null,
      provinceName: record.provinceName ?? null,
      categorySlug: record.categorySlug,
      businessType: record.businessType ?? null,
      publishedAt: record.publishedAt,
      publishedAtJalali: record.publishedAtJalali ?? null,
      createdAt: record.createdAt,
      permalink:
        record.permalink ?? (record.externalId ? `https://divar.ir/v/${record.externalId}` : null),
      imageUrl: record.medias[0]?.localUrl ?? record.medias[0]?.url ?? null,
      mediaCount: record.medias.length,
      medias: record.medias.map((media) => ({
        id: media.id,
        url: media.localUrl ?? media.url ?? '',
        thumbnailUrl:
          media.localThumbnailUrl ?? media.thumbnailUrl ?? media.localUrl ?? media.url ?? null,
        alt: media.alt ?? null,
      })),
      attributes:
        record.attributes?.map((attribute) => ({
          id: attribute.id,
          key: attribute.key,
          label: attribute.label ?? null,
          type: attribute.type ?? null,
          stringValue: attribute.stringValue ?? null,
          numberValue:
            attribute.numberValue !== null && attribute.numberValue !== undefined
              ? Number(attribute.numberValue)
              : null,
          boolValue: attribute.boolValue ?? null,
          unit: attribute.unit ?? null,
          rawValue: attribute.rawValue ?? null,
        })) ?? [],
    };
  }

  private extractSeoTitle(payload: Prisma.JsonValue): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const seo = (payload as Record<string, unknown>)['seo'];
    if (!seo || typeof seo !== 'object') {
      return null;
    }

    const title = (seo as Record<string, unknown>)['title'];
    return typeof title === 'string' && title.trim().length > 0 ? title.trim() : null;
  }
}

type DivarPostSummaryRecord = Prisma.DivarPostGetPayload<{
  select: typeof DIVAR_POST_SUMMARY_SELECT;
}>;
