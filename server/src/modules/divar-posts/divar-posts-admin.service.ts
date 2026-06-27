import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PrismaService } from '@app/platform/database/prisma.service';
import { getPersianQuarterDateRange } from '@common/utils/date.utils';
import { RedisService } from '@app/platform/cache/redis.service';
import cacheConfig from '@app/platform/config/cache.config';
import { PostAnalysisStatus, Prisma } from '@prisma/client';
import type { PaginatedPostsToAnalyzeDto, PostToAnalyzeItemDto } from './dto/post-to-analyze.dto';
import type { PaginatedDivarPostsDto, DivarPostListItemDto } from './dto/divar-post.dto';
import type {
  PaginatedPostsWithPhonesDto,
  PostsWithPhonesQueryDto,
} from './dto/posts-with-phones.dto';
import { applyCategoryFilters } from './divar-post-filter-builder';

const PAGE_SIZE_LIMIT = 100;

const DIVAR_POST_SUMMARY_SELECT = {
  id: true,
  externalId: true,
  title: true,
  displayTitle: true,
  seoTitle: true,
  description: true,
  ownerName: true,
  priceTotal: true,
  rentAmount: true,
  depositAmount: true,
  phoneNumber: true,
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
  latitude: true,
  longitude: true,
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
  cat1: true,
  cat2: true,
  cat3: true,
  category: {
    select: {
      name: true,
      parent: {
        select: { name: true },
      },
    },
  },
  code: true,
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

@Injectable()
export class DivarPostsAdminService {
  private readonly logger = new Logger(DivarPostsAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @Inject(cacheConfig.KEY)
    private readonly cacheCfg: ConfigType<typeof cacheConfig>,
  ) {}

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
      dateQuarter?: string;
      postIds?: string[];
      createdAfter?: Date;
    } = {},
  ): Promise<PaginatedDivarPostsDto> {
    const take = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const where: Prisma.DivarPostWhereInput = {};
    const isRingBinder = !!options.ringFolderId;

    if (!isRingBinder && options.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: options.userId },
        select: { role: true },
      });
      if (user && user.role !== 'ADMIN') {
        const subscription = await this.prisma.userSubscription.findFirst({
          where: {
            userId: options.userId,
            status: 'ACTIVE',
            endsAt: { gte: new Date() },
          },
          select: { districtAssignments: true },
          orderBy: { endsAt: 'desc' },
        });

        if (!subscription) {
          return {
            items: [],
            nextCursor: null,
            hasMore: false,
          };
        }

        const assignments = subscription.districtAssignments as Record<
          string,
          { id: number; cityId: number; provinceId: number }[]
        >;

        const accessibleDistricts = new Set<number>();
        const accessibleCities = new Set<number>();
        const accessibleProvinces = new Set<number>();
        for (const list of Object.values(assignments)) {
          for (const d of list) {
            accessibleDistricts.add(d.id);
            accessibleCities.add(d.cityId);
            accessibleProvinces.add(d.provinceId);
          }
        }

        if (accessibleDistricts.size === 0) {
          return {
            items: [],
            nextCursor: null,
            hasMore: false,
          };
        }

        const requestedDistrictIds = options.districtIds ?? [];
        const filteredDistrictIds = requestedDistrictIds.filter((id) =>
          accessibleDistricts.has(id),
        );
        const requestedCityIds = options.cityIds ?? [];
        const filteredCityIds = requestedCityIds.filter((id) => accessibleCities.has(id));
        const requestedProvinceId = options.provinceId;

        if (
          (requestedProvinceId !== undefined && !accessibleProvinces.has(requestedProvinceId)) ||
          (requestedCityIds.length > 0 && filteredCityIds.length === 0) ||
          (requestedDistrictIds.length > 0 && filteredDistrictIds.length === 0)
        ) {
          return {
            items: [],
            nextCursor: null,
            hasMore: false,
          };
        }

        options.districtIds = filteredDistrictIds;
        options.cityIds = filteredCityIds;
        if (requestedProvinceId !== undefined && accessibleProvinces.has(requestedProvinceId)) {
          options.provinceId = requestedProvinceId;
        } else {
          options.provinceId = undefined;
        }
      }
    }

    if (!isRingBinder) {
      if (typeof options.provinceId === 'number') {
        where.provinceId = options.provinceId;
      }
      // cityIds handled below after all other conditions are built
      if (options.districtIds && options.districtIds.length > 0) {
        where.districtId = { in: options.districtIds };
      }
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
      applyCategoryFilters(where, options.filters);
    }
    if (options.ringFolderId) {
      if (!options.userId) {
        throw new BadRequestException('Ring binder filter requires authentication.');
      }
      const folder = await this.prisma.ringBinderFolder.findFirst({
        where: {
          id: options.ringFolderId,
          deletedAt: null,
          OR: [
            { userId: options.userId },
            {
              shares: {
                some: { sharedWithUserId: options.userId },
              },
            },
          ],
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
    if (options.dateQuarter && !isRingBinder) {
      const ranges = options.dateQuarter
        .split(',')
        .map((q) => {
          const parts = q.trim().split('-');
          const year = parseInt(parts[0], 10);
          const quarter = parseInt(parts[1], 10);
          if (Number.isFinite(year) && Number.isFinite(quarter) && quarter >= 1 && quarter <= 4) {
            return getPersianQuarterDateRange(year, quarter);
          }
          return null;
        })
        .filter(Boolean) as { startDate: Date; endDate: Date }[];

      if (ranges.length > 0) {
        const startDate = new Date(Math.min(...ranges.map((r) => r.startDate.getTime())));
        const endDate = new Date(Math.max(...ranges.map((r) => r.endDate.getTime())));
        this.appendAndCondition(where, {
          publishedAt: { gte: startDate, lte: endDate },
        });
      }
    }
    if (options.postIds && options.postIds.length > 0) {
      where.id = { in: options.postIds };
    }
    if (options.createdAfter) {
      this.appendAndCondition(where, { createdAt: { gte: options.createdAfter } });
    }

    // Manual cursor: look up the cursor record and add a tuple comparison to WHERE
    // Prisma's built-in cursor: { id } generates WHERE id < cursor (broken for compound ORDER BY)
    if (options.cursor) {
      const cursorRecord = await this.prisma.divarPost.findUnique({
        where: { id: options.cursor },
        select: { publishedAt: true, createdAt: true },
      });
      if (cursorRecord) {
        if (cursorRecord.publishedAt !== null) {
          this.appendAndCondition(where, {
            OR: [
              { publishedAt: { lt: cursorRecord.publishedAt } },
              {
                publishedAt: cursorRecord.publishedAt,
                createdAt: { lt: cursorRecord.createdAt },
              },
              {
                publishedAt: cursorRecord.publishedAt,
                createdAt: cursorRecord.createdAt,
                id: { lt: options.cursor },
              },
            ],
          });
        } else {
          // publishedAt is NULL and it's the last group (DESC NULLS LAST)
          this.appendAndCondition(where, {
            publishedAt: null,
            OR: [
              { createdAt: { lt: cursorRecord.createdAt } },
              {
                createdAt: cursorRecord.createdAt,
                id: { lt: options.cursor },
              },
            ],
          });
        }
      }
    }

    const runQuery = (qWhere: Prisma.DivarPostWhereInput) =>
      this.prisma.divarPost.findMany({
        orderBy: [
          { publishedAt: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        select: DIVAR_POST_SUMMARY_SELECT,
        where: qWhere,
        take: take + 1,
      } satisfies Prisma.DivarPostFindManyArgs);

    // Multi-city (>1): run per-city queries in parallel using composite index
    if (!isRingBinder && options.cityIds && options.cityIds.length > 1) {
      const queries = options.cityIds.map((cityId) => {
        const cityWhere = structuredClone(where);
        cityWhere.cityId = cityId;
        return runQuery(cityWhere);
      });
      const results = await Promise.all(queries);
      const allRecords = results.flat();
      allRecords.sort((a, b) => {
        if (a.publishedAt !== null && b.publishedAt !== null) {
          const diff = b.publishedAt.getTime() - a.publishedAt.getTime();
          if (diff !== 0) return diff;
        } else if (a.publishedAt === null && b.publishedAt !== null) return 1;
        else if (a.publishedAt !== null && b.publishedAt === null) return -1;
        const createdAtDiff = b.createdAt.getTime() - a.createdAt.getTime();
        if (createdAtDiff !== 0) return createdAtDiff;
        return b.id.localeCompare(a.id);
      });
      const hasMore = allRecords.length > take;
      const items = hasMore ? allRecords.slice(0, take) : allRecords;
      const categoryLabels = await this.resolveCategoryLabels(items);
      return {
        items: items.map((record) => this.mapRecordToListItem(record, categoryLabels)),
        nextCursor: hasMore ? items[items.length - 1].id : null,
        hasMore,
      };
    }

    if (!isRingBinder && options.cityIds && options.cityIds.length === 1) {
      where.cityId = options.cityIds[0];
    }

    this.logger.debug(
      `DivarPosts query -> where: ${JSON.stringify(where)}, cursor: ${
        options.cursor
      }, limit: ${options.limit}, filters: ${options.filters ? JSON.stringify(options.filters) : 'none'}`,
    );

    const records = await runQuery(where);
    const hasMore = records.length > take;
    const items = hasMore ? records.slice(0, take) : records;
    const categoryLabels = await this.resolveCategoryLabels(items);

    return {
      items: items.map((record) => this.mapRecordToListItem(record, categoryLabels)),
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  async listPreviewPosts(options: {
    citySlug?: string;
    districtSlug?: string;
    limit?: number;
  }): Promise<DivarPostListItemDto[]> {
    const citySlug = options.citySlug?.trim();
    const districtSlug = options.districtSlug?.trim();
    const limit = options.limit ?? 40;
    const cacheKey = `divar:posts:preview:city:${citySlug ?? ''}:district:${districtSlug ?? ''}:limit:${limit}`;

    if (this.cacheCfg.enabled) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        if (process.env['NODE_ENV'] !== 'production') {
          this.logger.log(`Cache HIT: ${cacheKey}`);
        }
        return JSON.parse(cached) as DivarPostListItemDto[];
      }
    }

    let cityId: number | undefined;
    let districtId: number | undefined;

    if (districtSlug) {
      const district = await this.prisma.district.findFirst({
        where: { slug: districtSlug },
        select: { id: true, cityId: true },
      });
      if (!district) {
        return [];
      }
      districtId = district.id;
      cityId = district.cityId;
    } else if (citySlug) {
      const city = await this.prisma.city.findFirst({
        where: { slug: citySlug },
        select: { id: true },
      });
      if (!city) {
        return [];
      }
      cityId = city.id;
    }

    const { items } = await this.listNormalizedPosts({
      limit,
      cityIds: cityId ? [cityId] : undefined,
      districtIds: districtId ? [districtId] : undefined,
    });

    if (this.cacheCfg.enabled) {
      const cacheTtlMs = 5 * 60 * 1000;
      await this.redisService.pSetEx(cacheKey, cacheTtlMs, JSON.stringify(items));
    }

    return items;
  }

  async getPostWithMedias(id: string): Promise<{
    id: string;
    code: number | null;
    externalId: string | null;
    title: string | null;
    medias: { id: string; url: string | null; localUrl: string | null }[];
  } | null> {
    return this.prisma.divarPost.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
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
    const cacheKey = `divar:post:id:${id}`;

    if (this.cacheCfg.enabled) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        if (process.env['NODE_ENV'] !== 'production') {
          this.logger.log(`Cache HIT: ${cacheKey}`);
        }
        return JSON.parse(cached) as DivarPostListItemDto | null;
      }
    }

    const record = await this.prisma.divarPost.findUnique({
      where: { id },
      select: DIVAR_POST_SUMMARY_SELECT,
    });
    if (!record) {
      return null;
    }
    const categoryLabels = await this.resolveCategoryLabels([record]);
    const result = this.mapRecordToListItem(record, categoryLabels);

    if (this.cacheCfg.enabled) {
      const cacheTtlMs = 5 * 60 * 1000;
      await this.redisService.pSetEx(cacheKey, cacheTtlMs, JSON.stringify(result));
    }

    return result;
  }

  async getNormalizedPostByCode(code: number): Promise<DivarPostListItemDto | null> {
    const cacheKey = `divar:post:code:${code}`;

    if (this.cacheCfg.enabled) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        if (process.env['NODE_ENV'] !== 'production') {
          this.logger.log(`Cache HIT: ${cacheKey}`);
        }
        return JSON.parse(cached) as DivarPostListItemDto | null;
      }
    }

    const record = await this.prisma.divarPost.findUnique({
      where: { code },
      select: DIVAR_POST_SUMMARY_SELECT,
    });
    if (!record) {
      return null;
    }
    const categoryLabels = await this.resolveCategoryLabels([record]);
    const result = this.mapRecordToListItem(record, categoryLabels);

    if (this.cacheCfg.enabled) {
      const cacheTtlMs = 5 * 60 * 1000;
      await this.redisService.pSetEx(cacheKey, cacheTtlMs, JSON.stringify(result));
    }

    return result;
  }

  async getNormalizedPostByExternalId(externalId: string): Promise<DivarPostListItemDto | null> {
    const record = await this.prisma.divarPost.findUnique({
      where: { externalId },
      select: DIVAR_POST_SUMMARY_SELECT,
    });
    if (!record) {
      return null;
    }
    const categoryLabels = await this.resolveCategoryLabels([record]);
    return this.mapRecordToListItem(record, categoryLabels);
  }

  async listPostsByIds(ids: string[]): Promise<DivarPostListItemDto[]> {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return [];
    }

    const records = await this.prisma.divarPost.findMany({
      where: { id: { in: uniqueIds } },
      select: DIVAR_POST_SUMMARY_SELECT,
    });
    if (records.length === 0) {
      return [];
    }

    const categoryLabels = await this.resolveCategoryLabels(records);
    const mapped = records.map((record) => this.mapRecordToListItem(record, categoryLabels));
    const mappedById = new Map(mapped.map((item) => [item.id, item]));

    return ids
      .map((id) => mappedById.get(id))
      .filter((item): item is DivarPostListItemDto => Boolean(item));
  }

  async getPostContactInfo(id: string): Promise<{
    id: string;
    externalId: string | null;
    contactUuid: string | null;
    phoneNumber: string | null;
    ownerName: string | null;
  } | null> {
    return this.prisma.divarPost.findUnique({
      where: { id },
      select: {
        id: true,
        externalId: true,
        contactUuid: true,
        phoneNumber: true,
        ownerName: true,
      },
    });
  }

  async listPostsWithPhones(dto: PostsWithPhonesQueryDto): Promise<PaginatedPostsWithPhonesDto> {
    const page = Math.max(dto.page ?? 1, 1);
    const pageSize = Math.min(Math.max(dto.pageSize ?? 20, 1), 100);
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];

    if (dto.provinceId) {
      conditions.push(`dp."provinceId" = $${params.length + 1}`);
      params.push(dto.provinceId);
    }
    if (dto.cityId) {
      conditions.push(`dp."cityId" = $${params.length + 1}`);
      params.push(dto.cityId);
    }
    if (dto.districtId) {
      conditions.push(`dp."districtId" = $${params.length + 1}`);
      params.push(dto.districtId);
    }
    if (dto.cat3) {
      conditions.push(`dp."cat3" = $${params.length + 1}`);
      params.push(dto.cat3);
    }
    if (dto.businessType === 'personal') {
      conditions.push('dp."businessRef" IS NULL');
    } else if (dto.businessType === 'business') {
      conditions.push('dp."businessRef" IS NOT NULL');
    }
    if (dto.phoneFilter === 'has') {
      conditions.push(
        '(dp."phoneNumber" IS NOT NULL OR apr."phoneNumber" IS NOT NULL OR mpr."phoneNumber" IS NOT NULL)',
      );
    } else if (dto.phoneFilter === 'none') {
      conditions.push(
        '(dp."phoneNumber" IS NULL AND apr."phoneNumber" IS NULL AND mpr."phoneNumber" IS NULL)',
      );
    }
    if (dto.phone) {
      conditions.push(
        `(dp."phoneNumber" = $${params.length + 1} OR apr."phoneNumber" = $${params.length + 2} OR mpr."phoneNumber" = $${params.length + 3})`,
      );
      params.push(dto.phone, dto.phone, dto.phone);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      FROM "DivarPost" dp
      LEFT JOIN "ArkaPhoneRecord" apr ON apr."externalId" = dp."externalId"
      LEFT JOIN "MelkradarPhoneRecord" mpr ON mpr."externalId" = dp."externalId"
      ${whereClause}
    `;

    const countResult = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint as count ${baseQuery}`,
      ...params,
    );
    const totalItems = Number(countResult[0]?.count ?? 0);

    const rows = await this.prisma.$queryRawUnsafe<
      {
        id: string;
        code: number;
        externalId: string;
        title: string | null;
        cat3: string | null;
        provinceName: string | null;
        cityName: string | null;
        districtName: string | null;
        contactPhone: string | null;
        arkaPhone: string | null;
        melkradarPhone: string | null;
        publishedAt: Date | null;
        businessRef: string | null;
      }[]
    >(
      `SELECT
        dp.id,
        dp.code,
        dp."externalId",
        dp.title,
        dp.cat3,
        dp."provinceName",
        dp."cityName",
        dp."districtName",
        dp."phoneNumber" AS "contactPhone",
        apr."phoneNumber" AS "arkaPhone",
        mpr."phoneNumber" AS "melkradarPhone",
        dp."publishedAt",
        dp."businessRef"
      ${baseQuery}
      ORDER BY dp.code DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}`,
      ...params,
      pageSize,
      offset,
    );

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      items: rows.map((row) => ({
        id: row.id,
        code: row.code,
        externalId: row.externalId,
        title: row.title ?? null,
        cat3: row.cat3 ?? null,
        provinceName: row.provinceName ?? null,
        cityName: row.cityName ?? null,
        districtName: row.districtName ?? null,
        contactPhone: row.contactPhone ?? null,
        arkaPhone: row.arkaPhone ?? null,
        melkradarPhone: row.melkradarPhone ?? null,
        publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
        businessRef: row.businessRef ?? null,
      })),
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
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

  private mapRecordToListItem(
    record: DivarPostSummaryRecord,
    categoryLabels?: Map<string, string>,
  ): DivarPostListItemDto {
    const { categoryName, categoryParentName } = this.resolveCategoryNames(record, categoryLabels);

    return {
      id: record.id,
      code: record.code,
      externalId: record.externalId ?? '',
      title: record.title ?? record.displayTitle ?? record.seoTitle ?? null,
      description: record.description ?? null,
      ownerName: record.ownerName ?? null,
      hasContactInfo: Boolean(record.phoneNumber),
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
      latitude:
        record.latitude !== null && record.latitude !== undefined ? Number(record.latitude) : null,
      longitude:
        record.longitude !== null && record.longitude !== undefined
          ? Number(record.longitude)
          : null,
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
      categoryName,
      categoryParentName,
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

  private resolveCategoryNames(
    record: DivarPostSummaryRecord,
    categoryLabels?: Map<string, string>,
  ): { categoryName: string | null; categoryParentName: string | null } {
    const labels = categoryLabels ?? new Map<string, string>();
    let parentSlug: string | null = null;
    let childSlug: string | null = null;

    if (record.cat3) {
      childSlug = record.cat3;
      parentSlug = record.cat2 ?? null;
    } else if (record.cat2) {
      childSlug = record.cat2;
      parentSlug = record.cat1 ?? null;
    }

    const categoryName =
      (childSlug ? labels.get(childSlug) : null) ?? record.category?.name ?? null;
    const categoryParentName =
      (parentSlug ? labels.get(parentSlug) : null) ?? record.category?.parent?.name ?? null;

    return { categoryName, categoryParentName };
  }

  private async resolveCategoryLabels(
    records: DivarPostSummaryRecord[],
  ): Promise<Map<string, string>> {
    const slugs = new Set<string>();
    records.forEach((record) => {
      if (record.cat1) {
        slugs.add(record.cat1);
      }
      if (record.cat2) {
        slugs.add(record.cat2);
      }
      if (record.cat3) {
        slugs.add(record.cat3);
      }
    });

    if (slugs.size === 0) {
      return new Map();
    }

    const categories = await this.prisma.divarCategory.findMany({
      where: { slug: { in: Array.from(slugs) } },
      select: { slug: true, name: true },
    });

    return new Map(categories.map((category) => [category.slug, category.name]));
  }

  async getRingFolderDistricts(
    ringFolderId: string,
    userId: string,
  ): Promise<{ provinceIds: number[]; cityIds: number[]; districtIds: number[] }> {
    const folder = await this.prisma.ringBinderFolder.findFirst({
      where: {
        id: ringFolderId,
        deletedAt: null,
        OR: [
          { userId },
          {
            shares: {
              some: { sharedWithUserId: userId },
            },
          },
        ],
      },
      select: { id: true },
    });
    if (!folder) {
      return { provinceIds: [], cityIds: [], districtIds: [] };
    }

    const posts = await this.prisma.ringBinderFolderPost.findMany({
      where: { folderId: folder.id },
      select: {
        post: {
          select: { provinceId: true, cityId: true, districtId: true },
        },
      },
    });

    const provinceSet = new Set<number>();
    const citySet = new Set<number>();
    const districtSet = new Set<number>();
    for (const { post } of posts) {
      if (post.provinceId != null) provinceSet.add(post.provinceId);
      if (post.cityId != null) citySet.add(post.cityId);
      if (post.districtId != null) districtSet.add(post.districtId);
    }

    return {
      provinceIds: Array.from(provinceSet),
      cityIds: Array.from(citySet),
      districtIds: Array.from(districtSet),
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
