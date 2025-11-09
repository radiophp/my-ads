import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import { PostAnalysisStatus, type Prisma } from '@prisma/client';
import type { PaginatedPostsToAnalyzeDto, PostToAnalyzeItemDto } from './dto/post-to-analyze.dto';

const PAGE_SIZE_LIMIT = 100;

@Injectable()
export class DivarPostsAdminService {
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
