import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/platform/database/prisma.service';
import { QueueLocationScope, type Prisma } from '@prisma/client';

const DIVAR_SEARCH_URL = 'https://api.divar.ir/v8/postlist/w/search';
const PAGINATION_TYPE = 'type.googleapis.com/post_list.PaginationData';
const SERVER_PAYLOAD_TYPE = 'type.googleapis.com/widgets.SearchData.ServerPayload';
const MAX_REQUESTS_PER_SECOND = 3;
const RATE_LIMIT_WINDOW_MS = 1000;

type PaginationPayload = {
  '@type': string;
  page: number;
  layer_page: number;
  cumulative_widgets_count: number;
  last_post_date?: string;
};

interface CategoryScope {
  id: string;
  slug: string;
  name: string;
  displayPath: string;
  path: string;
}

interface LocationScope {
  scope: QueueLocationScope;
  apiId: number;
  slug: string;
  name: string;
  provinceId: number | null;
  cityId: number | null;
  label: string;
}

interface DivarWidget {
  widget_type?: string;
  data?: Record<string, unknown> & { token?: string; title?: string };
}

interface DivarSearchResponse {
  list_widgets?: DivarWidget[];
  pagination?: {
    data?: {
      last_post_date?: string;
      cumulative_widgets_count?: number;
    };
  };
}

export interface HarvestSummary {
  categories: number;
  locations: number;
  combinations: number;
  enqueued: number;
}

@Injectable()
export class DivarPostHarvestService {
  private readonly logger = new Logger(DivarPostHarvestService.name);
  private readonly sessionCookie?: string;
  private readonly maxPagesPerCombo?: number;
  private readonly requestDelayMs: number;
  private readonly requestTimeoutMs: number;
  private readonly requestTimestamps: number[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.sessionCookie = this.configService.get<string>('DIVAR_SESSION_COOKIE');
    this.maxPagesPerCombo = this.configService.get<number>('DIVAR_HARVEST_MAX_PAGES', {
      infer: true,
    });
    this.requestDelayMs =
      this.configService.get<number>('DIVAR_HARVEST_DELAY_MS', { infer: true }) ?? 750;
    this.requestTimeoutMs =
      this.configService.get<number>('DIVAR_HARVEST_TIMEOUT_MS', { infer: true }) ?? 15000;
  }

  @Cron(CronExpression.EVERY_30_MINUTES, {
    name: 'divar-post-harvest',
    disabled: true, // Remove "disabled" when you want the cronjob to run automatically.
  })
  async scheduledHarvest(): Promise<void> {
    await this.harvestAllowedScopes();
  }

  async harvestAllowedScopes(): Promise<HarvestSummary> {
    const [categoryScopes, locationScopes] = await Promise.all([
      this.resolveCategoryScopes(),
      this.resolveLocationScopes(),
    ]);

    const summary: HarvestSummary = {
      categories: categoryScopes.length,
      locations: locationScopes.length,
      combinations: 0,
      enqueued: 0,
    };

    if (categoryScopes.length === 0) {
      this.logger.warn('No categories with allowPosting=true found; skipping harvest.');
      return summary;
    }
    if (locationScopes.length === 0) {
      this.logger.warn('No provinces/cities with allowPosting=true found; skipping harvest.');
      return summary;
    }

    for (const location of locationScopes) {
      for (const category of categoryScopes) {
        summary.combinations += 1;
        try {
          const inserted = await this.fetchAndQueuePosts(category, location);
          summary.enqueued += inserted;
        } catch (error) {
          this.logger.error(
            `Failed to harvest posts for ${location.label} -> ${category.slug}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    }

    this.logger.log(
      `Divar harvest complete. Enqueued ${summary.enqueued} posts across ${summary.combinations} combinations (${summary.locations} locations x ${summary.categories} categories).`,
    );

    return summary;
  }

  private async resolveCategoryScopes(): Promise<CategoryScope[]> {
    const categories = await this.prisma.divarCategory.findMany({
      where: { allowPosting: true, isActive: true },
      orderBy: [{ depth: 'asc' }, { position: 'asc' }, { displayPath: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        displayPath: true,
        path: true,
      },
    });

    const selected: CategoryScope[] = [];
    const suppressedPaths: string[] = [];

    for (const category of categories) {
      const hasParentAlreadySelected = suppressedPaths.some(
        (prefix) => category.path === prefix || category.path.startsWith(`${prefix}/`),
      );
      if (hasParentAlreadySelected) {
        continue;
      }
      selected.push(category);
      suppressedPaths.push(category.path);
    }

    return selected;
  }

  private async resolveLocationScopes(): Promise<LocationScope[]> {
    const provinces = await this.prisma.province.findMany({
      where: { allowPosting: true },
      orderBy: [{ name: 'asc' }],
      select: { id: true, name: true, slug: true },
    });

    const provinceIds = new Set(provinces.map((province) => province.id));

    const cityWhere: Prisma.CityWhereInput = {
      allowPosting: true,
    };
    if (provinceIds.size > 0) {
      cityWhere.provinceId = { notIn: Array.from(provinceIds) };
    }

    const cities = await this.prisma.city.findMany({
      where: cityWhere,
      orderBy: [{ name: 'asc' }],
      select: { id: true, name: true, slug: true, provinceId: true },
    });

    const provinceScopes: LocationScope[] = provinces.map((province) => ({
      scope: QueueLocationScope.PROVINCE,
      apiId: province.id,
      slug: province.slug,
      name: province.name,
      provinceId: province.id,
      cityId: null,
      label: `province:${province.slug}`,
    }));

    const cityScopes: LocationScope[] = cities.map((city) => ({
      scope: QueueLocationScope.CITY,
      apiId: city.id,
      slug: city.slug,
      name: city.name,
      provinceId: city.provinceId,
      cityId: city.id,
      label: `city:${city.slug}`,
    }));

    return [...provinceScopes, ...cityScopes];
  }

  private async fetchAndQueuePosts(
    category: CategoryScope,
    location: LocationScope,
  ): Promise<number> {
    let page = 1;
    let lastPostDate: string | null = null;
    let cumulativeWidgets = 50;
    let inserted = 0;

    while (!this.maxPagesPerCombo || page <= this.maxPagesPerCombo) {
      this.logger.log(
        `Divar fetch start | category=${category.slug} (${category.id}, ${category.name}) | ${location.scope === QueueLocationScope.PROVINCE ? 'province' : 'city'}=${location.slug} (${location.apiId}, ${location.name}) | page=${page}`,
      );
      const body = this.buildRequestBody({
        location,
        category,
        page,
        cumulativeWidgets,
        lastPostDate,
      });

      const payload = await this.callDivarSearch(body);
      const postRows = this.extractPostRows(payload);

      if (postRows.length === 0) {
        break;
      }

      const { queueItems, logEntries, duplicateTokens, tokensForInsert } = this.prepareQueueRows(
        postRows,
        category,
        location,
      );

      if (logEntries.length > 0) {
        this.logger.log(
          `Divar page ${page} results | category=${category.slug} | location=${location.label} | posts:\n${logEntries
            .map((entry) => `• ${entry}`)
            .join('\n')}`,
        );
      }

      new Set(duplicateTokens).forEach((token) =>
        this.logger.warn(
          `Skipped duplicate token within page | token=${token} | category=${category.slug} | location=${location.label} | page=${page}`,
        ),
      );

      let duplicatesInDb = new Set<string>();
      if (queueItems.length > 0) {
        const existing = await this.prisma.postToReadQueue.findMany({
          where: {
            source: 'DIVAR',
            externalId: { in: tokensForInsert },
          },
          select: { externalId: true },
        });
        duplicatesInDb = new Set(existing.map((row) => row.externalId));
        duplicatesInDb.forEach((token) =>
          this.logger.warn(
            `Skipped duplicate token already in queue | token=${token} | category=${category.slug} | location=${location.label}`,
          ),
        );
      }

      const filteredQueueItems = queueItems.filter((item) => !duplicatesInDb.has(item.externalId));

      if (filteredQueueItems.length > 0) {
        const result = await this.prisma.postToReadQueue.createMany({
          data: filteredQueueItems,
          skipDuplicates: true,
        });
        inserted += result.count;
        this.logger.log(
          `Enqueued ${result.count} posts for category=${category.slug} in ${location.label} on page=${page}`,
        );
      }

      const paginationData = payload.pagination?.data;
      lastPostDate = paginationData?.last_post_date ?? null;
      cumulativeWidgets = paginationData?.cumulative_widgets_count ?? cumulativeWidgets;

      if (!lastPostDate) {
        break;
      }

      page += 1;

      if (this.requestDelayMs > 0) {
        await this.sleep(this.requestDelayMs);
      }
    }

    return inserted;
  }

  private buildRequestBody({
    location,
    category,
    page,
    cumulativeWidgets,
    lastPostDate,
  }: {
    location: LocationScope;
    category: CategoryScope;
    page: number;
    cumulativeWidgets: number;
    lastPostDate: string | null;
  }): Record<string, unknown> {
    const pagination: PaginationPayload = {
      '@type': PAGINATION_TYPE,
      page,
      layer_page: page,
      cumulative_widgets_count: cumulativeWidgets,
    };

    if (lastPostDate) {
      pagination.last_post_date = lastPostDate;
    }

    return {
      city_ids: [String(location.apiId)],
      pagination_data: pagination,
      disable_recommendation: true,
      map_state: { camera_info: { bbox: {} } },
      search_data: {
        form_data: {
          data: {
            category: {
              str: {
                value: category.slug,
              },
            },
          },
        },
        server_payload: {
          '@type': SERVER_PAYLOAD_TYPE,
          additional_form_data: {
            data: {
              sort: {
                str: {
                  value: 'sort_date',
                },
              },
            },
          },
        },
      },
    };
  }

  private async callDivarSearch(body: Record<string, unknown>): Promise<DivarSearchResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    await this.enforceRateLimit();

    try {
      const response = await fetch(DIVAR_SEARCH_URL, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MyAdsBot/1.0)',
          'Content-Type': 'application/json',
          Referer: 'https://divar.ir/',
          Origin: 'https://divar.ir',
          ...(this.sessionCookie ? { Cookie: this.sessionCookie } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Divar responded with ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as DivarSearchResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractPostRows(payload: DivarSearchResponse): DivarWidget[] {
    if (!Array.isArray(payload.list_widgets)) {
      return [];
    }
    return payload.list_widgets.filter((widget) => widget?.widget_type === 'POST_ROW');
  }

  private prepareQueueRows(
    postRows: DivarWidget[],
    category: CategoryScope,
    location: LocationScope,
  ): {
    queueItems: Prisma.PostToReadQueueCreateManyInput[];
    logEntries: string[];
    duplicateTokens: string[];
    tokensForInsert: string[];
  } {
    const queueItems: Prisma.PostToReadQueueCreateManyInput[] = [];
    const logEntries: string[] = [];
    const duplicateTokens: string[] = [];
    const seenTokens = new Set<string>();
    const tokensForInsert: string[] = [];

    for (const widget of postRows) {
      const token = this.extractToken(widget);
      if (!token) {
        continue;
      }

      const title = this.extractTitle(widget) ?? 'بدون عنوان';
      logEntries.push(`${title} (${token})`);

      if (seenTokens.has(token)) {
        duplicateTokens.push(token);
        continue;
      }
      seenTokens.add(token);
      tokensForInsert.push(token);

      const row: Prisma.PostToReadQueueCreateManyInput = {
        externalId: token,
        categoryId: category.id,
        categorySlug: category.slug,
        locationScope: location.scope,
        provinceId: location.provinceId ?? undefined,
        cityId: location.cityId ?? undefined,
      };

      if (widget.data) {
        row.payload = widget.data as Prisma.InputJsonValue;
      }

      queueItems.push(row);
    }

    return { queueItems, logEntries, duplicateTokens, tokensForInsert };
  }

  private extractToken(widget: DivarWidget): string | null {
    const candidates = [
      widget?.data?.token,
      (widget?.data as Record<string, unknown> | undefined)?.['post_token'],
      (widget?.data as Record<string, unknown> | undefined)?.['token_card'],
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
      if (
        candidate &&
        typeof candidate === 'object' &&
        typeof (candidate as Record<string, unknown>)['token'] === 'string'
      ) {
        const nested = (candidate as Record<string, unknown>)['token'];
        if (typeof nested === 'string' && nested.trim().length > 0) {
          return nested.trim();
        }
      }
    }

    return null;
  }

  private extractTitle(widget: DivarWidget): string | null {
    const title = widget?.data?.title;
    if (typeof title === 'string' && title.trim()) {
      return title.trim();
    }
    const summary = (widget?.data as Record<string, unknown> | undefined)?.['title'];
    return typeof summary === 'string' && summary.trim() ? summary.trim() : null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async enforceRateLimit(): Promise<void> {
    while (true) {
      const now = Date.now();
      while (
        this.requestTimestamps.length > 0 &&
        now - this.requestTimestamps[0] > RATE_LIMIT_WINDOW_MS
      ) {
        this.requestTimestamps.shift();
      }

      if (this.requestTimestamps.length < MAX_REQUESTS_PER_SECOND) {
        this.requestTimestamps.push(now);
        return;
      }

      const waitTime = RATE_LIMIT_WINDOW_MS - (now - this.requestTimestamps[0]);
      await this.sleep(Math.max(waitTime, 50));
    }
  }
}
