import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import { PostAnalysisStatus, type Prisma } from '@prisma/client';
import type { PaginatedPostsToAnalyzeDto, PostToAnalyzeItemDto } from './dto/post-to-analyze.dto';
import type { PaginatedDivarPostsDto } from './dto/divar-post.dto';

const PAGE_SIZE_LIMIT = 100;

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
      categorySlug?: string;
      categoryDepth?: number;
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
    if (options.categorySlug) {
      where.OR = [
        { categorySlug: options.categorySlug },
        { cat3: options.categorySlug },
        { cat2: options.categorySlug },
        { cat1: options.categorySlug },
      ];
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
      `DivarPosts query -> where: ${JSON.stringify(queryArgs.where)}, cursor: ${options.cursor}, limit: ${options.limit}`,
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
