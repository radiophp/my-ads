import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';
import { DivarPostsAdminService } from '@app/modules/divar-posts/divar-posts-admin.service';
import type { DivarPostListItemDto } from '@app/modules/divar-posts/dto/divar-post.dto';
import type { CreateFeaturedPostDto } from './dto/create-featured-post.dto';
import type { UpdateFeaturedPostDto } from './dto/update-featured-post.dto';
import type { FeaturedPostAdminItemDto, FeaturedPostLookupDto } from './dto/featured-post.dto';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const FEATURED_POSTS_CACHE_KEY = 'featured-posts:public';
const FEATURED_POSTS_CACHE_TTL_MS = 2 * 60 * 60 * 1000;

const featuredPostSelect = {
  id: true,
  postId: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  post: {
    select: {
      id: true,
      code: true,
      externalId: true,
      title: true,
    },
  },
} satisfies Prisma.FeaturedPostSelect;

type FeaturedPostRecord = Prisma.FeaturedPostGetPayload<{ select: typeof featuredPostSelect }>;

const isMissingFeaturedPostTable = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';

const getFeaturedPostDelegate = (prisma: PrismaService) => {
  const delegate = (prisma as PrismaService & { featuredPost?: Prisma.FeaturedPostDelegate })
    .featuredPost;
  if (!delegate) {
    return null;
  }
  return delegate;
};

const mapFeaturedPostRecord = (record: FeaturedPostRecord): FeaturedPostAdminItemDto => ({
  id: record.id,
  postId: record.postId,
  sortOrder: record.sortOrder,
  isActive: record.isActive,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  post: {
    id: record.post.id,
    code: record.post.code,
    externalId: record.post.externalId,
    title: record.post.title,
  },
});

@Injectable()
export class FeaturedPostsService {
  private readonly logger = new Logger(FeaturedPostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly divarPostsAdminService: DivarPostsAdminService,
    private readonly redisService: RedisService,
  ) {}

  private parseCachedList(value: string): DivarPostListItemDto[] | null {
    try {
      const parsed = JSON.parse(value) as DivarPostListItemDto[];
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      this.logger.warn(`Failed to parse cached featured posts: ${(error as Error).message}`);
      return null;
    }
  }

  private async clearPublicCache(): Promise<void> {
    try {
      await this.redisService.del(FEATURED_POSTS_CACHE_KEY);
    } catch (error) {
      this.logger.warn(`Failed to clear featured posts cache: ${(error as Error).message}`);
    }
  }

  async listPublicFeaturedPosts() {
    const cached = await this.redisService.get(FEATURED_POSTS_CACHE_KEY);
    if (cached) {
      const parsed = this.parseCachedList(cached);
      if (parsed) {
        return parsed;
      }
    }

    try {
      const delegate = getFeaturedPostDelegate(this.prisma);
      if (!delegate) {
        return [];
      }
      const featured = await delegate.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: {
          postId: true,
        },
      });
      const postIds = featured.map((entry) => entry.postId);
      const posts = await this.divarPostsAdminService.listPostsByIds(postIds);
      try {
        await this.redisService.pSetEx(
          FEATURED_POSTS_CACHE_KEY,
          FEATURED_POSTS_CACHE_TTL_MS,
          JSON.stringify(posts),
        );
      } catch (error) {
        this.logger.warn(`Failed to cache featured posts: ${(error as Error).message}`);
      }
      return posts;
    } catch (error) {
      if (isMissingFeaturedPostTable(error)) {
        return [];
      }
      throw error;
    }
  }

  async listAdminFeaturedPosts(page = 1, pageSize = DEFAULT_PAGE_SIZE, search?: string) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const skip = (safePage - 1) * safeSize;
    const normalizedSearch = search?.trim();

    const where: Prisma.FeaturedPostWhereInput = {};
    if (normalizedSearch) {
      const parsedCode = Number(normalizedSearch);
      const codeFilter = Number.isFinite(parsedCode) ? parsedCode : null;
      where.post = {
        OR: [
          { title: { contains: normalizedSearch, mode: 'insensitive' } },
          { externalId: { contains: normalizedSearch, mode: 'insensitive' } },
          ...(codeFilter ? [{ code: codeFilter }] : []),
        ],
      };
    }

    let items: FeaturedPostRecord[] = [];
    let total = 0;
    try {
      const delegate = getFeaturedPostDelegate(this.prisma);
      if (!delegate) {
        return { items: [], total: 0, page: safePage, pageSize: safeSize };
      }
      [items, total] = await Promise.all([
        delegate.findMany({
          where,
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: safeSize,
          select: featuredPostSelect,
        }),
        delegate.count({ where }),
      ]);
    } catch (error) {
      if (!isMissingFeaturedPostTable(error)) {
        throw error;
      }
    }

    return {
      items: items.map(mapFeaturedPostRecord),
      total,
      page: safePage,
      pageSize: safeSize,
    };
  }

  async getAdminFeaturedPost(id: string): Promise<FeaturedPostAdminItemDto> {
    let record: FeaturedPostRecord | null = null;
    try {
      const delegate = getFeaturedPostDelegate(this.prisma);
      if (!delegate) {
        throw new NotFoundException('Featured post not found');
      }
      record = await delegate.findUnique({
        where: { id },
        select: featuredPostSelect,
      });
    } catch (error) {
      if (isMissingFeaturedPostTable(error)) {
        throw new NotFoundException('Featured post not found');
      }
      throw error;
    }
    if (!record) {
      throw new NotFoundException('Featured post not found');
    }
    return mapFeaturedPostRecord(record);
  }

  async lookupPost(code?: number, externalId?: string): Promise<FeaturedPostLookupDto> {
    if (!code && !externalId) {
      throw new BadRequestException('Provide a post code or externalId.');
    }
    const post = code
      ? await this.divarPostsAdminService.getNormalizedPostByCode(code)
      : await this.divarPostsAdminService.getNormalizedPostByExternalId(externalId ?? '');

    if (!post) {
      return { found: false, post: null };
    }

    return {
      found: true,
      post,
    };
  }

  async createFeaturedPost(dto: CreateFeaturedPostDto): Promise<FeaturedPostAdminItemDto> {
    const code = dto.code;
    const externalId = dto.externalId?.trim();
    if (!code && !externalId) {
      throw new BadRequestException('Provide a post code or externalId.');
    }

    const post = code
      ? await this.divarPostsAdminService.getNormalizedPostByCode(code)
      : await this.divarPostsAdminService.getNormalizedPostByExternalId(externalId ?? '');

    if (!post) {
      throw new NotFoundException('Post not found.');
    }

    try {
      const delegate = getFeaturedPostDelegate(this.prisma);
      if (!delegate) {
        throw new ServiceUnavailableException('Featured posts are not initialized.');
      }
      const created = await delegate.create({
        data: {
          postId: post.id,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
        select: featuredPostSelect,
      });
      await this.clearPublicCache();
      return mapFeaturedPostRecord(created);
    } catch (error) {
      if (isMissingFeaturedPostTable(error)) {
        throw new ServiceUnavailableException('Featured posts are not initialized.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Post already featured.');
      }
      throw error;
    }
  }

  async updateFeaturedPost(
    id: string,
    dto: UpdateFeaturedPostDto,
  ): Promise<FeaturedPostAdminItemDto> {
    try {
      const delegate = getFeaturedPostDelegate(this.prisma);
      if (!delegate) {
        throw new ServiceUnavailableException('Featured posts are not initialized.');
      }
      const updated = await delegate.update({
        where: { id },
        data: {
          sortOrder: dto.sortOrder,
          isActive: dto.isActive,
        },
        select: featuredPostSelect,
      });
      await this.clearPublicCache();
      return mapFeaturedPostRecord(updated);
    } catch (error) {
      if (isMissingFeaturedPostTable(error)) {
        throw new ServiceUnavailableException('Featured posts are not initialized.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Featured post not found');
      }
      throw error;
    }
  }

  async deleteFeaturedPost(id: string): Promise<void> {
    try {
      const delegate = getFeaturedPostDelegate(this.prisma);
      if (!delegate) {
        throw new ServiceUnavailableException('Featured posts are not initialized.');
      }
      await delegate.delete({ where: { id } });
      await this.clearPublicCache();
    } catch (error) {
      if (isMissingFeaturedPostTable(error)) {
        throw new ServiceUnavailableException('Featured posts are not initialized.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Featured post not found');
      }
      throw error;
    }
  }
}
