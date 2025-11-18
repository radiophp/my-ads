import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { DivarCategoryFilterDto, type FilterOptionDto } from './dto/divar-category-filter.dto';
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

type NormalizedFilterOptions = Record<string, FilterOptionDto[]>;

@Injectable()
export class DivarCategoryFiltersService {
  private readonly logger = new Logger(DivarCategoryFiltersService.name);
  private readonly filtersApiUrl = 'https://api.divar.ir/v8/postlist/w/filters';
  /**
   * Divar requires a city id even though the resulting configuration is effectively global.
   * We default to Tehran (1) purely to keep the districts widget populated.
   */
  private readonly filterRequestCityId = process.env['DIVAR_FILTERS_REQUEST_CITY_ID'] ?? '1';
  private readonly filterPageLocationSlug = 'alborz-province';
  private readonly normalizedFilterKeys = new Set([
    'filter_building_direction',
    'filter_cooling_system',
    'filter_heating_system',
    'filter_floor_type',
    'filter_toilet',
    'filter_warm_water_provider',
  ]);
  private readonly normalizedFetchDelayMs = Number(
    process.env['DIVAR_FILTER_FETCH_DELAY_MS'] ?? 300,
  );
  private readonly normalizedFetchMaxRetries = Number(
    process.env['DIVAR_FILTER_FETCH_MAX_RETRIES'] ?? 3,
  );

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
      this.logger.log(`Syncing filters for "${category.slug}"...`);
      try {
        const payload = await this.fetchFiltersPayload(category.slug, targetCityId);
        const normalizedOptions = await this.fetchNormalizedFilterOptionsFromPage(category.slug);
        const normalizedOptionsJson = normalizedOptions as unknown as Prisma.JsonObject;
        await this.prisma.divarCategoryFilter.upsert({
          where: { categoryId: category.id },
          create: { categoryId: category.id, payload, normalizedOptions: normalizedOptionsJson },
          update: { payload, normalizedOptions: normalizedOptionsJson },
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

      if (this.normalizedFetchDelayMs > 0) {
        await this.delay(this.normalizedFetchDelayMs);
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
        normalizedOptions: true,
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
      normalizedOptions: (record.normalizedOptions as NormalizedFilterOptions | null) ?? {},
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

    const responseBody = await response.text();
    if (!response.ok) {
      throw new Error(
        `Divar filters request failed (${response.status} ${response.statusText}) for slug "${slug}". Body: ${responseBody.substring(
          0,
          500,
        )}`,
      );
    }

    return JSON.parse(responseBody) as Prisma.InputJsonValue;
  }

  private async fetchNormalizedFilterOptionsFromPage(
    slug: string,
  ): Promise<NormalizedFilterOptions> {
    if (this.normalizedFilterKeys.size === 0) {
      return {};
    }

    const attempts = Math.max(1, this.normalizedFetchMaxRetries);
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await fetch(`https://divar.ir/s/${this.filterPageLocationSlug}/${slug}`, {
          headers: {
            accept: 'text/html,application/xhtml+xml,application/xml',
            'user-agent': 'my-ads-backend/1.0',
          },
        });
        if (response.status === 429 && attempt < attempts) {
          await this.delay(this.normalizedFetchDelayMs * attempt);
          continue;
        }
        if (!response.ok) {
          throw new Error(
            `Failed to load category page (${response.status} ${response.statusText})`,
          );
        }
        const html = await response.text();
        const stateMatch = html.match(/__PRELOADED_STATE__\s*=\s*(\{.*?\});/s);
        if (!stateMatch) {
          throw new Error('Divar page did not include __PRELOADED_STATE__');
        }
        const state = JSON.parse(stateMatch[1]) as Record<string, unknown>;
        const nbState = this.asRecord(state['nb']);
        const filtersPage = this.asRecord(nbState?.['filtersPage']);
        const widgetList = this.asArray(filtersPage?.['widgetList']);
        if (!widgetList) {
          return {};
        }
        const normalized: NormalizedFilterOptions = {};
        widgetList.forEach((widget) => {
          const record = this.asRecord(widget);
          if (!record) {
            return;
          }
          const uid = this.getString(record, 'uid');
          if (!uid || !this.normalizedFilterKeys.has(uid)) {
            return;
          }
          const options = this.normalizeOptions(record);
          if (options.length > 0) {
            normalized[uid] = options;
          }
        });
        return normalized;
      } catch (error) {
        if (attempt === attempts) {
          this.logger.warn(
            `Failed to extract normalized options for "${slug}": ${
              error instanceof Error ? error.message : error
            }`,
          );
        } else if (this.normalizedFetchDelayMs > 0) {
          await this.delay(this.normalizedFetchDelayMs * attempt);
        }
      }
    }

    return {};
  }

  private normalizeOptions(widgetRecord: Record<string, unknown>): FilterOptionDto[] {
    const dataRecord =
      this.asRecord(widgetRecord['data']) ??
      this.asRecord(this.asRecord(widgetRecord['dto'])?.['data']);
    const rawOptions = this.asArray(dataRecord?.['options']);
    if (!rawOptions) {
      return [];
    }
    return rawOptions
      .map((option) => this.toFilterOption(option))
      .filter((option): option is FilterOptionDto => Boolean(option));
  }

  private toFilterOption(option: unknown): FilterOptionDto | null {
    const record = this.asRecord(option);
    if (!record) {
      return null;
    }
    const value =
      this.getString(record, 'key') ??
      this.getString(record, 'value') ??
      this.getString(record, 'title');
    const label =
      this.getString(record, 'title') ??
      this.getString(record, 'display') ??
      this.getString(record, 'label') ??
      this.getString(record, 'value');
    if (!value || !label || value === 'ALL_POSSIBLE_OPTIONS') {
      return null;
    }
    return { value, label };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private asArray(value: unknown): unknown[] | null {
    return Array.isArray(value) ? value : null;
  }

  private getString(
    record: Record<string, unknown> | null | undefined,
    key: string,
  ): string | null {
    if (!record) {
      return null;
    }
    const value = record[key];
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async delay(ms: number): Promise<void> {
    if (ms <= 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
