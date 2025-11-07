import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { DivarCategoryFilterDto } from './dto/divar-category-filter.dto';
import { DivarCategoryFilterSummaryDto } from './dto/divar-category-filter-summary.dto';

type DivarCategoryFiltersSyncFailure = {
  slug: string;
  reason: string;
};

export type DivarCategoryFiltersSyncResult = {
  total: number;
  created: number;
  updated: number;
  failed: DivarCategoryFiltersSyncFailure[];
};

@Injectable()
export class DivarCategoryFiltersService {
  private readonly logger = new Logger(DivarCategoryFiltersService.name);
  private readonly filtersApiUrl = 'https://api.divar.ir/v8/postlist/w/filters';
  /**
   * Divar requires a city id even though the resulting configuration is effectively global.
   * We default to Tehran (1) purely to keep the districts widget populated.
   */
  private readonly filterRequestCityId = process.env['DIVAR_FILTERS_REQUEST_CITY_ID'] ?? '1';

  constructor(private readonly prisma: PrismaService) {}

  async syncFiltersFromApi(cityId?: string): Promise<DivarCategoryFiltersSyncResult> {
    const categories = await this.prisma.divarCategory.findMany({
      where: { isActive: true },
      select: { id: true, slug: true },
      orderBy: [{ depth: 'asc' }, { position: 'asc' }, { name: 'asc' }],
    });

    const existing = new Set(
      (
        await this.prisma.divarCategoryFilter.findMany({
          select: { categoryId: true },
        })
      ).map((record) => record.categoryId),
    );

    const summary: DivarCategoryFiltersSyncResult = {
      total: categories.length,
      created: 0,
      updated: 0,
      failed: [],
    };

    const targetCityId = cityId ?? this.filterRequestCityId;

    for (const category of categories) {
      try {
        const payload = await this.fetchFiltersPayload(category.slug, targetCityId);
        await this.prisma.divarCategoryFilter.upsert({
          where: { categoryId: category.id },
          create: { categoryId: category.id, payload },
          update: { payload },
        });

        if (existing.has(category.id)) {
          summary.updated += 1;
        } else {
          summary.created += 1;
          existing.add(category.id);
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to sync filters for "${category.slug}": ${reason}`);
        summary.failed.push({ slug: category.slug, reason });
      }
    }

    return summary;
  }

  async getFiltersBySlug(slug: string): Promise<DivarCategoryFilterDto> {
    const record = await this.prisma.divarCategoryFilter.findFirst({
      where: {
        category: {
          slug,
          isActive: true,
        },
      },
      select: {
        payload: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            slug: true,
            name: true,
            displayPath: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Filters for category "${slug}" were not found.`);
    }

    return {
      categoryId: record.category.id,
      categorySlug: record.category.slug,
      categoryName: record.category.name,
      displayPath: record.category.displayPath,
      payload: record.payload,
      updatedAt: record.updatedAt,
    };
  }

  async listFilterSummaries(): Promise<DivarCategoryFilterSummaryDto[]> {
    const records = await this.prisma.divarCategoryFilter.findMany({
      include: {
        category: {
          select: {
            id: true,
            slug: true,
            name: true,
            displayPath: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((record) => ({
      categoryId: record.category.id,
      categorySlug: record.category.slug,
      categoryName: record.category.name,
      displayPath: record.category.displayPath,
      updatedAt: record.updatedAt,
    }));
  }

  private async fetchFiltersPayload(slug: string, cityId: string): Promise<Prisma.InputJsonValue> {
    const body = JSON.stringify({
      city_ids: [cityId],
      data: {
        form_data: {
          data: {
            category: {
              str: { value: slug },
            },
          },
        },
        server_payload: {
          '@type': 'type.googleapis.com/widgets.SearchData.ServerPayload',
          additional_form_data: {
            data: {
              sort: {
                str: { value: 'sort_date' },
              },
            },
          },
        },
      },
      source_view: 'CATEGORY_BREAD_CRUMB',
    });

    const response = await fetch(this.filtersApiUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'user-agent': 'my-ads-backend/1.0',
        origin: 'https://divar.ir',
        referer: 'https://divar.ir/',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(
        `Divar filters request failed (${response.status} ${response.statusText}) for slug "${slug}".`,
      );
    }

    return (await response.json()) as Prisma.InputJsonValue;
  }
}
