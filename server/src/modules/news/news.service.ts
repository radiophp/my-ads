import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';
import cacheConfig from '@app/platform/config/cache.config';
import { normalizeSlug } from './news.utils';
import type { CreateNewsDto } from './dto/create-news.dto';
import type { UpdateNewsDto } from './dto/update-news.dto';
import type { CreateNewsCategoryDto } from './dto/create-news-category.dto';
import type { UpdateNewsCategoryDto } from './dto/update-news-category.dto';
import type { CreateNewsTagDto } from './dto/create-news-tag.dto';
import type { UpdateNewsTagDto } from './dto/update-news-tag.dto';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;
const DEFAULT_SOURCE_SLUG = 'mahanfile';
const DEFAULT_SOURCE_NAME = 'ماهان فایل';

const newsSelect = {
  id: true,
  title: true,
  slug: true,
  shortText: true,
  content: true,
  mainImageUrl: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
    },
  },
  source: {
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
    },
  },
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
};

const summarySelect = {
  id: true,
  title: true,
  slug: true,
  shortText: true,
  mainImageUrl: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  source: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
};

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @Inject(cacheConfig.KEY)
    private readonly cacheCfg: ConfigType<typeof cacheConfig>,
  ) {}

  private mapNews(record: any) {
    return {
      ...record,
      tags: record.tags?.map((item: { tag: unknown }) => item.tag) ?? [],
    };
  }

  private async ensureUniqueNewsSlug(base: string, excludeId?: string) {
    const slug = normalizeSlug(base);
    if (!slug) {
      throw new BadRequestException('News slug cannot be empty.');
    }
    let candidate = slug;
    let suffix = 1;
    while (true) {
      const existing = await this.prisma.news.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) {
        return candidate;
      }
      candidate = `${slug}-${suffix}`;
      suffix += 1;
    }
  }

  private async ensureUniqueCategorySlug(base: string, excludeId?: string) {
    const slug = normalizeSlug(base);
    if (!slug) {
      throw new BadRequestException('Category slug cannot be empty.');
    }
    let candidate = slug;
    let suffix = 1;
    while (true) {
      const existing = await this.prisma.newsCategory.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) {
        return candidate;
      }
      candidate = `${slug}-${suffix}`;
      suffix += 1;
    }
  }

  private async ensureUniqueTagSlug(base: string, excludeId?: string) {
    const slug = normalizeSlug(base);
    if (!slug) {
      throw new BadRequestException('Tag slug cannot be empty.');
    }
    let candidate = slug;
    let suffix = 1;
    while (true) {
      const existing = await this.prisma.newsTag.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) {
        return candidate;
      }
      candidate = `${slug}-${suffix}`;
      suffix += 1;
    }
  }

  private async ensureUniqueSourceSlug(base: string, excludeId?: string) {
    const slug = normalizeSlug(base);
    if (!slug) {
      throw new BadRequestException('Source slug cannot be empty.');
    }
    let candidate = slug;
    let suffix = 1;
    while (true) {
      const existing = await this.prisma.newsSource.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) {
        return candidate;
      }
      candidate = `${slug}-${suffix}`;
      suffix += 1;
    }
  }

  private async ensureSourceId(slug: string, name: string) {
    const existing = await this.prisma.newsSource.findUnique({ where: { slug } });
    if (existing) {
      return existing.id;
    }
    const created = await this.prisma.newsSource.create({
      data: {
        name,
        slug,
        isActive: true,
      },
    });
    return created.id;
  }

  async listPublic(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const cacheKey = `news:list:public:page:${safePage}:size:${safeSize}`;

    if (this.cacheCfg.enabled) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        if (process.env['NODE_ENV'] !== 'production') {
          this.logger.log(`Cache HIT: ${cacheKey}`);
        }
        return JSON.parse(cached);
      }
    }

    const skip = (safePage - 1) * safeSize;

    const [items, total] = await Promise.all([
      this.prisma.news.findMany({
        where: { category: { isActive: true } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeSize,
        select: summarySelect,
      }),
      this.prisma.news.count({ where: { category: { isActive: true } } }),
    ]);

    const result = {
      items: items.map((item) => this.mapNews(item)),
      total,
      page: safePage,
      pageSize: safeSize,
    };

    if (this.cacheCfg.enabled) {
      await this.redisService.pSetEx(cacheKey, 5 * 60 * 1000, JSON.stringify(result));
    }

    return result;
  }

  async getPublicBySlug(slug: string) {
    const cacheKey = `news:slug:${slug}`;

    if (this.cacheCfg.enabled) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        if (process.env['NODE_ENV'] !== 'production') {
          this.logger.log(`Cache HIT: ${cacheKey}`);
        }
        return JSON.parse(cached);
      }
    }

    const record = await this.prisma.news.findUnique({
      where: { slug },
      select: newsSelect,
    });

    if (!record) {
      throw new NotFoundException('News item not found.');
    }

    const result = this.mapNews(record);

    if (this.cacheCfg.enabled) {
      await this.redisService.pSetEx(cacheKey, 5 * 60 * 1000, JSON.stringify(result));
    }

    return result;
  }

  async listAdminNews(page = 1, pageSize = DEFAULT_PAGE_SIZE, search?: string) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const trimmedSearch = search?.trim();
    const cacheKey = `news:list:admin:page:${safePage}:size:${safeSize}:search:${trimmedSearch ?? ''}`;

    if (this.cacheCfg.enabled) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        if (process.env['NODE_ENV'] !== 'production') {
          this.logger.log(`Cache HIT: ${cacheKey}`);
        }
        return JSON.parse(cached);
      }
    }

    const skip = (safePage - 1) * safeSize;
    const where = trimmedSearch
      ? {
          title: {
            contains: trimmedSearch,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : undefined;

    const [items, total] = await Promise.all([
      this.prisma.news.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: safeSize,
        select: newsSelect,
      }),
      this.prisma.news.count({ where }),
    ]);

    const result = {
      items: items.map((item) => this.mapNews(item)),
      total,
      page: safePage,
      pageSize: safeSize,
    };

    if (this.cacheCfg.enabled) {
      await this.redisService.pSetEx(cacheKey, 5 * 60 * 1000, JSON.stringify(result));
    }

    return result;
  }

  async getAdminNewsById(id: string) {
    const cacheKey = `news:id:${id}`;

    if (this.cacheCfg.enabled) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        if (process.env['NODE_ENV'] !== 'production') {
          this.logger.log(`Cache HIT: ${cacheKey}`);
        }
        return JSON.parse(cached);
      }
    }

    const item = await this.prisma.news.findUnique({
      where: { id },
      select: newsSelect,
    });

    if (!item) {
      throw new NotFoundException('News item not found.');
    }

    const result = this.mapNews(item);

    if (this.cacheCfg.enabled) {
      await this.redisService.pSetEx(cacheKey, 5 * 60 * 1000, JSON.stringify(result));
    }

    return result;
  }

  async createNews(dto: CreateNewsDto) {
    const slug = await this.ensureUniqueNewsSlug(dto.slug ?? dto.title);
    const tagIds = dto.tagIds ?? [];
    const sourceId =
      dto.sourceId ?? (await this.ensureSourceId(DEFAULT_SOURCE_SLUG, DEFAULT_SOURCE_NAME));

    const created = await this.prisma.news.create({
      data: {
        title: dto.title,
        slug,
        shortText: dto.shortText ?? null,
        content: dto.content,
        mainImageUrl: dto.mainImageUrl ?? null,
        categoryId: dto.categoryId,
        sourceId,
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
      select: newsSelect,
    });

    await this.invalidateNewsCache();

    return this.mapNews(created);
  }

  async updateNews(id: string, dto: UpdateNewsDto) {
    const existing = await this.prisma.news.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('News item not found.');
    }

    const slugBase = dto.slug ?? dto.title ?? existing.slug;
    const slug = await this.ensureUniqueNewsSlug(slugBase, existing.id);

    const tagUpdate = dto.tagIds
      ? {
          deleteMany: {},
          create: dto.tagIds.map((tagId) => ({ tagId })),
        }
      : undefined;

    const updated = await this.prisma.news.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        slug,
        shortText: dto.shortText ?? null,
        content: dto.content ?? existing.content,
        mainImageUrl: dto.mainImageUrl ?? null,
        categoryId: dto.categoryId ?? existing.categoryId,
        sourceId: dto.sourceId ?? existing.sourceId,
        ...(tagUpdate ? { tags: tagUpdate } : {}),
      },
      select: newsSelect,
    });

    await this.invalidateNewsCache();

    return this.mapNews(updated);
  }

  async deleteNews(id: string) {
    await this.prisma.news.delete({ where: { id } });
    await this.invalidateNewsCache();
  }

  async listCategories() {
    const cacheKey = 'news:categories';
    if (this.cacheCfg.enabled) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        if (process.env['NODE_ENV'] !== 'production') {
          this.logger.log(`Cache HIT: ${cacheKey}`);
        }
        return JSON.parse(cached);
      }
    }

    const result = await this.prisma.newsCategory.findMany({ orderBy: { createdAt: 'desc' } });

    if (this.cacheCfg.enabled) {
      await this.redisService.pSetEx(cacheKey, 5 * 60 * 1000, JSON.stringify(result));
    }

    return result;
  }

  async createCategory(dto: CreateNewsCategoryDto) {
    const slug = await this.ensureUniqueCategorySlug(dto.slug ?? dto.name);

    const result = await this.prisma.newsCategory.create({
      data: {
        name: dto.name,
        slug,
        isActive: dto.isActive ?? true,
      },
    });

    await this.invalidateNewsCache();

    return result;
  }

  async updateCategory(id: string, dto: UpdateNewsCategoryDto) {
    const existing = await this.prisma.newsCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('News category not found.');
    }

    const slugBase = dto.slug ?? dto.name ?? existing.slug;
    const slug = await this.ensureUniqueCategorySlug(slugBase, existing.id);

    const result = await this.prisma.newsCategory.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        slug,
        isActive: dto.isActive ?? existing.isActive,
      },
    });

    await this.invalidateNewsCache();

    return result;
  }

  async deleteCategory(id: string) {
    await this.prisma.newsCategory.delete({ where: { id } });
    await this.invalidateNewsCache();
  }

  async listTags() {
    const cacheKey = 'news:tags';
    if (this.cacheCfg.enabled) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        if (process.env['NODE_ENV'] !== 'production') {
          this.logger.log(`Cache HIT: ${cacheKey}`);
        }
        return JSON.parse(cached);
      }
    }

    const result = await this.prisma.newsTag.findMany({ orderBy: { createdAt: 'desc' } });

    if (this.cacheCfg.enabled) {
      await this.redisService.pSetEx(cacheKey, 5 * 60 * 1000, JSON.stringify(result));
    }

    return result;
  }

  async listSources() {
    const cacheKey = 'news:sources';
    if (this.cacheCfg.enabled) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        if (process.env['NODE_ENV'] !== 'production') {
          this.logger.log(`Cache HIT: ${cacheKey}`);
        }
        return JSON.parse(cached);
      }
    }

    const result = await this.prisma.newsSource.findMany({ orderBy: { updatedAt: 'desc' } });

    if (this.cacheCfg.enabled) {
      await this.redisService.pSetEx(cacheKey, 5 * 60 * 1000, JSON.stringify(result));
    }

    return result;
  }

  async updateSource(id: string, dto: { name?: string; slug?: string; isActive?: boolean }) {
    const existing = await this.prisma.newsSource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('News source not found.');
    }

    const slugBase = dto.slug ?? dto.name ?? existing.slug;
    const slug = await this.ensureUniqueSourceSlug(slugBase, existing.id);

    const result = await this.prisma.newsSource.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        slug,
        isActive: dto.isActive ?? existing.isActive,
      },
    });

    await this.invalidateNewsCache();

    return result;
  }

  async createTag(dto: CreateNewsTagDto) {
    const slug = await this.ensureUniqueTagSlug(dto.slug ?? dto.name);

    const result = await this.prisma.newsTag.create({
      data: {
        name: dto.name,
        slug,
      },
    });

    await this.invalidateNewsCache();

    return result;
  }

  async updateTag(id: string, dto: UpdateNewsTagDto) {
    const existing = await this.prisma.newsTag.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('News tag not found.');
    }

    const slugBase = dto.slug ?? dto.name ?? existing.slug;
    const slug = await this.ensureUniqueTagSlug(slugBase, existing.id);

    const result = await this.prisma.newsTag.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        slug,
      },
    });

    await this.invalidateNewsCache();

    return result;
  }

  async deleteTag(id: string) {
    await this.prisma.newsTag.delete({ where: { id } });
    await this.invalidateNewsCache();
  }

  private async invalidateNewsCache(): Promise<void> {
    if (!this.cacheCfg.enabled) {
      return;
    }
    await this.redisService.delPattern('news:*');
    if (process.env['NODE_ENV'] !== 'production') {
      this.logger.log('Cache INVALIDATED: news:*');
    }
  }
}
