import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import { PostAnalysisStatus, Prisma } from '@prisma/client';
import type { PaginatedPostsToAnalyzeDto, PostToAnalyzeItemDto } from './dto/post-to-analyze.dto';
import type { PaginatedDivarPostsDto } from './dto/divar-post.dto';

const PAGE_SIZE_LIMIT = 100;

const NUMBER_RANGE_FIELD_MAP = {
  price: { column: 'priceTotal', type: 'decimal' },
  price_per_square: { column: 'pricePerSquare', type: 'decimal' },
  rent: { column: 'rentAmount', type: 'decimal' },
  credit: { column: 'depositAmount', type: 'decimal' },
  size: { column: 'area', type: 'int' },
  floor: { column: 'floor', type: 'int' },
  floors_count: { column: 'floorsCount', type: 'int' },
  unit_per_floor: { column: 'unitPerFloor', type: 'int' },
  land_area: { column: 'landArea', type: 'int' },
} as const;

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
    const queryArgs: Prisma.DivarPostFindManyArgs = {
      orderBy: [
        { publishedAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      include: {
        medias: {
          orderBy: { position: 'asc' },
        },
      },
      take: take + 1,
      where,
      ...(options.cursor
        ? {
            skip: 1,
            cursor: { id: options.cursor },
          }
        : {}),
    };

    this.logger.debug(
      `DivarPosts query -> where: ${JSON.stringify(queryArgs.where)}, cursor: ${
        options.cursor
      }, limit: ${options.limit}, filters: ${options.filters ? JSON.stringify(options.filters) : 'none'}`,
    );

    const records = await this.prisma.divarPost.findMany({
      ...queryArgs,
      include: {
        medias: {
          orderBy: { position: 'asc' },
        },
      },
    });
    const hasMore = records.length > take;
    const items = hasMore ? records.slice(0, take) : records;

    return {
      items: items.map((record) => ({
        id: record.id,
        externalId: record.externalId,
        title: record.title ?? record.displayTitle ?? record.seoTitle ?? null,
        description: record.description ?? null,
        priceTotal: record.priceTotal ? Number(record.priceTotal) : null,
        rentAmount: record.rentAmount ? Number(record.rentAmount) : null,
        pricePerSquare: record.pricePerSquare ? Number(record.pricePerSquare) : null,
        area: record.area ?? null,
        cityName: record.cityName ?? null,
        districtName: record.districtName ?? null,
        provinceName: record.provinceName ?? null,
        categorySlug: record.categorySlug,
        businessType: record.businessType ?? null,
        publishedAt: record.publishedAt,
        publishedAtJalali: record.publishedAtJalali,
        createdAt: record.createdAt,
        permalink:
          record.permalink ??
          (record.externalId ? `https://divar.ir/v/${record.externalId}` : null),
        imageUrl: record.medias[0]?.url ?? null,
        mediaCount: record.medias.length,
        medias: record.medias.map((media) => ({
          id: media.id,
          url: media.url,
          thumbnailUrl: media.thumbnailUrl,
          alt: media.alt,
        })),
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
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
        case 'business-type':
          handledKeys.add(key);
          this.applyBusinessTypeFilter(where, value);
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
    const normalized = this.normalizeClientRange(value);
    if (!normalized) {
      this.logger.debug(`DivarPosts filters: invalid range payload for "${key}"`);
      return true;
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
