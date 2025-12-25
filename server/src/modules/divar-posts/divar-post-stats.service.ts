import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PostAnalysisStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';
import { DivarPostCategoryCountDto } from './dto/divar-post-category-count.dto';
import { DivarDistrictPriceReportRowDto } from './dto/divar-post-district-report.dto';

type CategoryCountRow = {
  slug: string;
  name: string;
  displayPath: string;
  position: number;
  personalCount: bigint;
  businessCount: bigint;
  count: bigint;
};

type DistrictPriceRow = {
  districtId: number;
  districtName: string;
  districtSlug: string;
  postCount: bigint;
  minPriceTotal: Prisma.Decimal | null;
  avgPriceTotal: Prisma.Decimal | null;
  maxPriceTotal: Prisma.Decimal | null;
  minPricePerSquare: Prisma.Decimal | null;
  avgPricePerSquare: Prisma.Decimal | null;
  maxPricePerSquare: Prisma.Decimal | null;
  minRentAmount: Prisma.Decimal | null;
  avgRentAmount: Prisma.Decimal | null;
  maxRentAmount: Prisma.Decimal | null;
  minDepositAmount: Prisma.Decimal | null;
  avgDepositAmount: Prisma.Decimal | null;
  maxDepositAmount: Prisma.Decimal | null;
};

const CATEGORY_COUNT_CACHE_KEY = 'divar-posts:category-counts:v4';
const CATEGORY_COUNT_CACHE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class DivarPostStatsService {
  private readonly logger = new Logger(DivarPostStatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getCategoryCounts(): Promise<DivarPostCategoryCountDto[]> {
    const cached = await this.redisService.get(CATEGORY_COUNT_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as DivarPostCategoryCountDto[];
      } catch (error) {
        this.logger.warn(`Failed to parse cached category counts: ${(error as Error).message}`);
      }
    }

    const rows = await this.prisma.$queryRaw<CategoryCountRow[]>(Prisma.sql`
      SELECT
        cat.slug,
        cat.name,
        cat."displayPath",
        cat.position,
        COUNT(DISTINCT p.id) FILTER (
          WHERE COALESCE(p."businessType", 'personal') = 'personal'
        ) AS "personalCount",
        COUNT(DISTINCT p.id) FILTER (
          WHERE COALESCE(p."businessType", '') <> 'personal'
        ) AS "businessCount",
        COUNT(DISTINCT p.id) AS count
      FROM "DivarCategory" AS cat
      LEFT JOIN "DivarCategory" AS child
        ON child."parentId" = cat.id
      LEFT JOIN "DivarPost" AS p
        ON COALESCE(p."cat3", p."cat2", p."cat1") = cat.slug
      WHERE cat.depth > 0
        AND cat."isActive" = true
        AND cat."allowPosting" = true
      GROUP BY cat.id, cat.slug, cat.name, cat.position
      HAVING COUNT(DISTINCT child.id) = 0
        AND COUNT(DISTINCT p.id) > 1000
      ORDER BY count DESC;
    `);

    const counts = rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      displayPath: row.displayPath,
      personalCount: Number(row.personalCount) || 0,
      businessCount: Number(row.businessCount) || 0,
      count: Number(row.count) || 0,
    }));

    try {
      await this.redisService.pSetEx(
        CATEGORY_COUNT_CACHE_KEY,
        CATEGORY_COUNT_CACHE_TTL_MS,
        JSON.stringify(counts),
      );
    } catch (error) {
      this.logger.warn(`Failed to cache category counts: ${(error as Error).message}`);
    }

    return counts;
  }

  async getDistrictPriceReport(params: {
    categorySlug: string;
    createdAfter: Date;
    createdBefore: Date;
    minValue: number;
    maxValue?: number | null;
  }): Promise<DivarDistrictPriceReportRowDto[]> {
    const categorySlug = params.categorySlug.trim();
    if (!categorySlug) {
      throw new BadRequestException('Category slug is required.');
    }
    const minValue = Number(params.minValue);
    const maxValue =
      params.maxValue === undefined || params.maxValue === null ? null : Number(params.maxValue);
    if (!Number.isFinite(minValue) || minValue < 0) {
      throw new BadRequestException('Minimum value is invalid.');
    }
    if (maxValue !== null && (!Number.isFinite(maxValue) || maxValue < 0)) {
      throw new BadRequestException('Maximum value is invalid.');
    }
    if (maxValue !== null && maxValue < minValue) {
      throw new BadRequestException('Maximum value must be greater than minimum value.');
    }

    const category = await this.prisma.divarCategory.findUnique({
      where: { slug: categorySlug },
      select: {
        slug: true,
        _count: {
          select: { children: true },
        },
      },
    });

    if (!category) {
      throw new BadRequestException('Category not found.');
    }

    if (category._count.children > 0) {
      throw new BadRequestException('Category must be a leaf category.');
    }

    const rows = await this.prisma.$queryRaw<DistrictPriceRow[]>(Prisma.sql`
      SELECT
        district.id AS "districtId",
        district.name AS "districtName",
        district.slug AS "districtSlug",
        COUNT(post.id) AS "postCount",
        MIN(post."priceTotal") FILTER (
          WHERE post."priceTotal" >= ${minValue}
            AND (${maxValue} IS NULL OR post."priceTotal" <= ${maxValue})
        ) AS "minPriceTotal",
        AVG(post."priceTotal") FILTER (
          WHERE post."priceTotal" >= ${minValue}
            AND (${maxValue} IS NULL OR post."priceTotal" <= ${maxValue})
        ) AS "avgPriceTotal",
        MAX(post."priceTotal") FILTER (
          WHERE post."priceTotal" >= ${minValue}
            AND (${maxValue} IS NULL OR post."priceTotal" <= ${maxValue})
        ) AS "maxPriceTotal",
        MIN(post."pricePerSquare") FILTER (
          WHERE post."pricePerSquare" >= ${minValue}
            AND (${maxValue} IS NULL OR post."pricePerSquare" <= ${maxValue})
        ) AS "minPricePerSquare",
        AVG(post."pricePerSquare") FILTER (
          WHERE post."pricePerSquare" >= ${minValue}
            AND (${maxValue} IS NULL OR post."pricePerSquare" <= ${maxValue})
        ) AS "avgPricePerSquare",
        MAX(post."pricePerSquare") FILTER (
          WHERE post."pricePerSquare" >= ${minValue}
            AND (${maxValue} IS NULL OR post."pricePerSquare" <= ${maxValue})
        ) AS "maxPricePerSquare",
        MIN(post."rentAmount") FILTER (
          WHERE post."rentAmount" >= ${minValue}
            AND (${maxValue} IS NULL OR post."rentAmount" <= ${maxValue})
        ) AS "minRentAmount",
        AVG(post."rentAmount") FILTER (
          WHERE post."rentAmount" >= ${minValue}
            AND (${maxValue} IS NULL OR post."rentAmount" <= ${maxValue})
        ) AS "avgRentAmount",
        MAX(post."rentAmount") FILTER (
          WHERE post."rentAmount" >= ${minValue}
            AND (${maxValue} IS NULL OR post."rentAmount" <= ${maxValue})
        ) AS "maxRentAmount",
        MIN(post."depositAmount") FILTER (
          WHERE post."depositAmount" >= ${minValue}
            AND (${maxValue} IS NULL OR post."depositAmount" <= ${maxValue})
        ) AS "minDepositAmount",
        AVG(post."depositAmount") FILTER (
          WHERE post."depositAmount" >= ${minValue}
            AND (${maxValue} IS NULL OR post."depositAmount" <= ${maxValue})
        ) AS "avgDepositAmount",
        MAX(post."depositAmount") FILTER (
          WHERE post."depositAmount" >= ${minValue}
            AND (${maxValue} IS NULL OR post."depositAmount" <= ${maxValue})
        ) AS "maxDepositAmount"
      FROM "DivarPost" AS post
      INNER JOIN "District" AS district
        ON district.id = post."districtId"
      WHERE post."districtId" IS NOT NULL
        AND (
          post."cat3" = ${categorySlug}
          OR post."categorySlug" = ${categorySlug}
          OR (post."cat3" IS NULL AND post."cat2" = ${categorySlug})
          OR (post."cat3" IS NULL AND post."cat2" IS NULL AND post."cat1" = ${categorySlug})
        )
        AND post."createdAt" >= ${params.createdAfter}
        AND post."createdAt" < ${params.createdBefore}
        AND post.status = ${PostAnalysisStatus.COMPLETED}::"PostAnalysisStatus"
      GROUP BY district.id, district.name, district.slug
      ORDER BY "postCount" DESC;
    `);

    const toNumber = (value: unknown): number | null => {
      if (value === null || value === undefined) {
        return null;
      }
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    return rows.map((row) => ({
      districtId: Number(row.districtId),
      districtName: row.districtName,
      districtSlug: row.districtSlug,
      postCount: Number(row.postCount) || 0,
      minPriceTotal: toNumber(row.minPriceTotal),
      avgPriceTotal: toNumber(row.avgPriceTotal),
      maxPriceTotal: toNumber(row.maxPriceTotal),
      minPricePerSquare: toNumber(row.minPricePerSquare),
      avgPricePerSquare: toNumber(row.avgPricePerSquare),
      maxPricePerSquare: toNumber(row.maxPricePerSquare),
      minRentAmount: toNumber(row.minRentAmount),
      avgRentAmount: toNumber(row.avgRentAmount),
      maxRentAmount: toNumber(row.maxRentAmount),
      minDepositAmount: toNumber(row.minDepositAmount),
      avgDepositAmount: toNumber(row.avgDepositAmount),
      maxDepositAmount: toNumber(row.maxDepositAmount),
    }));
  }
}
