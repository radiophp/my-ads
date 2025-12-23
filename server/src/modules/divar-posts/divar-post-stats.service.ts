import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';
import { DivarPostCategoryCountDto } from './dto/divar-post-category-count.dto';

type CategoryCountRow = {
  slug: string;
  name: string;
  displayPath: string;
  position: number;
  personalCount: bigint;
  businessCount: bigint;
  count: bigint;
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
}
