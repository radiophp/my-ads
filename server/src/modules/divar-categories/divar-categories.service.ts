import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import type { DivarCategoryDto } from './dto/divar-category.dto';
import type { Prisma } from '@prisma/client';

type DivarCategoryPayload = {
  display: string;
  slug: string;
};

type DivarCategoryResponse = {
  categories?: DivarCategoryPayload[];
};

export type DivarCategorySyncResult = {
  total: number;
  created: number;
  updated: number;
  deactivated: number;
};

type EnrichedCategory = {
  slug: string;
  displayPath: string;
  name: string;
  depth: number;
  order: number;
  parentDisplay?: string | null;
};

type CategoryNode = {
  id: string;
  path: string;
};

@Injectable()
export class DivarCategoriesService {
  private readonly logger = new Logger(DivarCategoriesService.name);

  private readonly apiUrl = 'https://api.divar.ir/v1/open-platform/assets/category';

  constructor(private readonly prisma: PrismaService) {}

  async syncCategoriesFromApi(): Promise<DivarCategorySyncResult> {
    this.logger.log('Fetching Divar categories…');
    const response = await fetch(this.apiUrl, {
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch categories from Divar. Status: ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as DivarCategoryResponse;
    const categories = this.normalizePayload(payload);
    if (categories.length === 0) {
      throw new Error('Divar category payload did not contain any categories.');
    }
    this.logger.log(`Fetched ${categories.length} categories from Divar.`);

    return this.persistCategories(categories);
  }

  private normalizePayload(payload: DivarCategoryResponse): EnrichedCategory[] {
    const categories = Array.isArray(payload.categories) ? payload.categories : [];
    const sanitized = categories.filter(
      (category): category is DivarCategoryPayload =>
        Boolean(category?.slug?.trim()) && Boolean(category?.display?.trim()),
    );

    const displayToSlug = new Map<string, string>();
    sanitized.forEach((category) => {
      displayToSlug.set(category.display.trim(), category.slug.trim());
    });

    return sanitized
      .map<EnrichedCategory>((category, order) => {
        const displayPath = category.display.trim();
        const segments = displayPath
          .split(' - ')
          .map((segment) => segment.trim())
          .filter(Boolean);
        const name = segments.at(-1) ?? category.slug.trim();
        const parentSegments = segments.slice(0, -1);
        const parentDisplay = parentSegments.length > 0 ? parentSegments.join(' - ') : null;

        return {
          slug: category.slug.trim(),
          displayPath,
          name,
          depth: Math.max(segments.length - 1, 0),
          order,
          parentDisplay,
        };
      })
      .sort((a, b) => {
        if (a.depth === b.depth) {
          return a.order - b.order;
        }
        return a.depth - b.depth;
      })
      .map((category) => {
        if (category.parentDisplay) {
          const normalizedParent = category.parentDisplay.trim();
          category.parentDisplay = displayToSlug.has(normalizedParent)
            ? normalizedParent
            : category.parentDisplay;
        }
        return category;
      });
  }

  private async persistCategories(
    categories: EnrichedCategory[],
  ): Promise<DivarCategorySyncResult> {
    const existing = await this.prisma.divarCategory.findMany({
      select: { id: true, slug: true, path: true },
    });

    const slugToExisting = new Map(existing.map((record) => [record.slug, record]));
    const slugToNode = new Map<string, CategoryNode>(
      existing.map((record) => [record.slug, { id: record.id, path: record.path }]),
    );

    const displayToSlug = new Map(
      categories.map((category) => [category.displayPath, category.slug]),
    );

    const processedSlugs = new Set<string>();
    let created = 0;
    let updated = 0;

    for (const category of categories) {
      const parentSlug =
        category.parentDisplay !== null && category.parentDisplay !== undefined
          ? (displayToSlug.get(category.parentDisplay) ?? null)
          : null;

      if (parentSlug && !slugToNode.has(parentSlug)) {
        const existingParent = slugToExisting.get(parentSlug);
        if (existingParent) {
          slugToNode.set(parentSlug, {
            id: existingParent.id,
            path: existingParent.path,
          });
        }
      }

      const parentNode = parentSlug ? (slugToNode.get(parentSlug) ?? null) : null;
      const path = parentNode ? `${parentNode.path}/${category.slug}` : category.slug;
      const data = {
        name: category.name,
        displayPath: category.displayPath,
        depth: category.depth,
        position: category.order,
        path,
        parentId: parentNode?.id ?? null,
        isActive: true,
      };

      const result = await this.prisma.divarCategory.upsert({
        where: { slug: category.slug },
        create: {
          slug: category.slug,
          ...data,
        },
        update: data,
      });

      if (slugToExisting.has(category.slug)) {
        updated += 1;
      } else {
        created += 1;
      }

      slugToNode.set(category.slug, { id: result.id, path: result.path });
      processedSlugs.add(category.slug);
    }

    const { count: deactivated } = await this.prisma.divarCategory.updateMany({
      where: {
        slug: { notIn: Array.from(processedSlugs) },
        isActive: true,
      },
      data: { isActive: false },
    });

    const summary: DivarCategorySyncResult = {
      total: categories.length,
      created,
      updated,
      deactivated,
    };

    this.logger.log(
      `Divar categories synced. Created: ${created}, Updated: ${updated}, Deactivated: ${deactivated}, Total processed: ${categories.length}`,
    );

    return summary;
  }

  async listCategories(): Promise<DivarCategoryDto[]> {
    const categories = await this.prisma.divarCategory.findMany({
      orderBy: [{ displayPath: 'asc' }],
      include: this.includeForCategory(),
    });

    return categories.map((category) => this.toDto(category));
  }

  async updateAllowPosting(id: string, allowPosting: boolean): Promise<DivarCategoryDto> {
    const category = await this.prisma.divarCategory.update({
      where: { id },
      data: { allowPosting },
      include: this.includeForCategory(),
    });
    return this.toDto(category);
  }

  private includeForCategory() {
    return {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: { children: true },
      },
    };
  }

  private toDto(
    category: Prisma.DivarCategoryGetPayload<{
      include: ReturnType<DivarCategoriesService['includeForCategory']>;
    }>,
  ): DivarCategoryDto {
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      displayPath: category.displayPath,
      path: category.path,
      parentId: category.parentId,
      parentName: category.parent?.name ?? null,
      parentSlug: category.parent?.slug ?? null,
      depth: category.depth,
      position: category.position,
      childrenCount: category._count.children,
      isActive: category.isActive,
      allowPosting: category.allowPosting,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
