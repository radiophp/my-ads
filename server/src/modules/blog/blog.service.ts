import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { normalizeSlug } from './blog.utils';
import type { CreateBlogDto } from './dto/create-blog.dto';
import type { UpdateBlogDto } from './dto/update-blog.dto';
import type { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import type { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';
import type { CreateBlogTagDto } from './dto/create-blog-tag.dto';
import type { UpdateBlogTagDto } from './dto/update-blog-tag.dto';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;
const DEFAULT_SOURCE_SLUG = 'mahanfile';
const DEFAULT_SOURCE_NAME = 'ماهان فایل';

const blogSelect = {
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
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  private mapBlog(record: any) {
    return {
      ...record,
      tags: record.tags?.map((item: { tag: unknown }) => item.tag) ?? [],
    };
  }

  private async ensureUniqueBlogSlug(base: string, excludeId?: string) {
    const slug = normalizeSlug(base);
    if (!slug) {
      throw new BadRequestException('Blog slug cannot be empty.');
    }
    let candidate = slug;
    let suffix = 1;
    while (true) {
      const existing = await this.prisma.blog.findUnique({ where: { slug: candidate } });
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
      const existing = await this.prisma.blogCategory.findUnique({ where: { slug: candidate } });
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
      const existing = await this.prisma.blogTag.findUnique({ where: { slug: candidate } });
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
      const existing = await this.prisma.blogSource.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) {
        return candidate;
      }
      candidate = `${slug}-${suffix}`;
      suffix += 1;
    }
  }

  private async ensureSourceId(slug: string, name: string) {
    const existing = await this.prisma.blogSource.findUnique({ where: { slug } });
    if (existing) {
      return existing.id;
    }
    const created = await this.prisma.blogSource.create({
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
    const skip = (safePage - 1) * safeSize;

    const [items, total] = await Promise.all([
      this.prisma.blog.findMany({
        where: { category: { isActive: true } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeSize,
        select: summarySelect,
      }),
      this.prisma.blog.count({ where: { category: { isActive: true } } }),
    ]);

    return {
      items: items.map((item) => this.mapBlog(item)),
      total,
      page: safePage,
      pageSize: safeSize,
    };
  }

  async getPublicBySlug(slug: string) {
    const record = await this.prisma.blog.findUnique({
      where: { slug },
      select: blogSelect,
    });

    if (!record) {
      throw new NotFoundException('Blog item not found.');
    }

    return this.mapBlog(record);
  }

  async listAdminBlog(page = 1, pageSize = DEFAULT_PAGE_SIZE, search?: string) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const skip = (safePage - 1) * safeSize;
    const trimmedSearch = search?.trim();
    const where = trimmedSearch
      ? {
          title: {
            contains: trimmedSearch,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : undefined;

    const [items, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: safeSize,
        select: blogSelect,
      }),
      this.prisma.blog.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapBlog(item)),
      total,
      page: safePage,
      pageSize: safeSize,
    };
  }

  async getAdminBlogById(id: string) {
    const item = await this.prisma.blog.findUnique({
      where: { id },
      select: blogSelect,
    });

    if (!item) {
      throw new NotFoundException('Blog item not found.');
    }

    return this.mapBlog(item);
  }

  async createBlog(dto: CreateBlogDto) {
    const slug = await this.ensureUniqueBlogSlug(dto.slug ?? dto.title);
    const tagIds = dto.tagIds ?? [];
    const sourceId =
      dto.sourceId ?? (await this.ensureSourceId(DEFAULT_SOURCE_SLUG, DEFAULT_SOURCE_NAME));

    const created = await this.prisma.blog.create({
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
      select: blogSelect,
    });

    return this.mapBlog(created);
  }

  async updateBlog(id: string, dto: UpdateBlogDto) {
    const existing = await this.prisma.blog.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog item not found.');
    }

    const slugBase = dto.slug ?? dto.title ?? existing.slug;
    const slug = await this.ensureUniqueBlogSlug(slugBase, existing.id);

    const tagUpdate = dto.tagIds
      ? {
          deleteMany: {},
          create: dto.tagIds.map((tagId) => ({ tagId })),
        }
      : undefined;

    const updated = await this.prisma.blog.update({
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
      select: blogSelect,
    });

    return this.mapBlog(updated);
  }

  async deleteBlog(id: string) {
    await this.prisma.blog.delete({ where: { id } });
  }

  async listCategories() {
    return this.prisma.blogCategory.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createCategory(dto: CreateBlogCategoryDto) {
    const slug = await this.ensureUniqueCategorySlug(dto.slug ?? dto.name);
    return this.prisma.blogCategory.create({
      data: {
        name: dto.name,
        slug,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateBlogCategoryDto) {
    const existing = await this.prisma.blogCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog category not found.');
    }

    const slugBase = dto.slug ?? dto.name ?? existing.slug;
    const slug = await this.ensureUniqueCategorySlug(slugBase, existing.id);

    return this.prisma.blogCategory.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        slug,
        isActive: dto.isActive ?? existing.isActive,
      },
    });
  }

  async deleteCategory(id: string) {
    await this.prisma.blogCategory.delete({ where: { id } });
  }

  async listTags() {
    return this.prisma.blogTag.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async listSources() {
    return this.prisma.blogSource.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async updateSource(id: string, dto: { name?: string; slug?: string; isActive?: boolean }) {
    const existing = await this.prisma.blogSource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog source not found.');
    }

    const slugBase = dto.slug ?? dto.name ?? existing.slug;
    const slug = await this.ensureUniqueSourceSlug(slugBase, existing.id);

    return this.prisma.blogSource.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        slug,
        isActive: dto.isActive ?? existing.isActive,
      },
    });
  }

  async createTag(dto: CreateBlogTagDto) {
    const slug = await this.ensureUniqueTagSlug(dto.slug ?? dto.name);
    return this.prisma.blogTag.create({
      data: {
        name: dto.name,
        slug,
      },
    });
  }

  async updateTag(id: string, dto: UpdateBlogTagDto) {
    const existing = await this.prisma.blogTag.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Blog tag not found.');
    }

    const slugBase = dto.slug ?? dto.name ?? existing.slug;
    const slug = await this.ensureUniqueTagSlug(slugBase, existing.id);

    return this.prisma.blogTag.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        slug,
      },
    });
  }

  async deleteTag(id: string) {
    await this.prisma.blogTag.delete({ where: { id } });
  }
}
