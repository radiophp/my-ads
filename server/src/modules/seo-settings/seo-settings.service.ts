import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';
import { SEO_PAGE_KEYS, SeoPageKey, isSeoPageKey } from './seo-settings.constants';
import { UpdateSeoSettingDto } from './dto/update-seo-setting.dto';

const isMissingSeoTable = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';

const SEO_SETTINGS_CACHE_PREFIX = 'seo-settings:';
const SEO_SETTINGS_CACHE_TTL_MS = 10 * 60 * 1000;

const normalizeValue = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

type SeoSettingRecord = {
  pageKey: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  updatedAt: Date;
};

export type SeoSettingItem = {
  pageKey: SeoPageKey;
  title: string | null;
  description: string | null;
  keywords: string | null;
  updatedAt?: Date;
};

@Injectable()
export class SeoSettingsService {
  private readonly logger = new Logger(SeoSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private ensureKey(pageKey: string): SeoPageKey {
    if (!isSeoPageKey(pageKey)) {
      throw new BadRequestException('Invalid SEO page key.');
    }
    return pageKey;
  }

  private toItem(pageKey: SeoPageKey, record?: SeoSettingRecord | null): SeoSettingItem {
    return {
      pageKey,
      title: record?.title ?? null,
      description: record?.description ?? null,
      keywords: record?.keywords ?? null,
      updatedAt: record?.updatedAt,
    };
  }

  private cacheKey(pageKey: SeoPageKey): string {
    return `${SEO_SETTINGS_CACHE_PREFIX}${pageKey}`;
  }

  private parseCached(value: string): SeoSettingItem | null {
    try {
      const cached = JSON.parse(value) as SeoSettingItem & { updatedAt?: string };
      return {
        ...cached,
        updatedAt: cached.updatedAt ? new Date(cached.updatedAt) : undefined,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse cached SEO settings: ${(error as Error).message}`);
      return null;
    }
  }

  async listAdmin(): Promise<SeoSettingItem[]> {
    try {
      const items = await this.prisma.seoSetting.findMany({
        where: { pageKey: { in: [...SEO_PAGE_KEYS] } },
        orderBy: { pageKey: 'asc' },
      });
      const map = new Map(items.map((item) => [item.pageKey, item]));
      return SEO_PAGE_KEYS.map((pageKey) => this.toItem(pageKey, map.get(pageKey)));
    } catch (error) {
      if (isMissingSeoTable(error)) {
        return SEO_PAGE_KEYS.map((pageKey) => this.toItem(pageKey, null));
      }
      throw error;
    }
  }

  async getPublic(pageKey: string): Promise<SeoSettingItem> {
    const key = this.ensureKey(pageKey);
    const cached = await this.redisService.get(this.cacheKey(key));
    if (cached) {
      const parsed = this.parseCached(cached);
      if (parsed) {
        return parsed;
      }
    }

    try {
      const record = await this.prisma.seoSetting.findUnique({ where: { pageKey: key } });
      const item = this.toItem(key, record);
      try {
        await this.redisService.pSetEx(
          this.cacheKey(key),
          SEO_SETTINGS_CACHE_TTL_MS,
          JSON.stringify(item),
        );
      } catch (error) {
        this.logger.warn(`Failed to cache SEO settings: ${(error as Error).message}`);
      }
      return item;
    } catch (error) {
      if (isMissingSeoTable(error)) {
        return this.toItem(key, null);
      }
      throw error;
    }
  }

  async upsert(pageKey: string, dto: UpdateSeoSettingDto): Promise<SeoSettingItem> {
    const key = this.ensureKey(pageKey);
    try {
      const record = await this.prisma.seoSetting.upsert({
        where: { pageKey: key },
        create: {
          pageKey: key,
          title: normalizeValue(dto.title),
          description: normalizeValue(dto.description),
          keywords: normalizeValue(dto.keywords),
        },
        update: {
          title: normalizeValue(dto.title),
          description: normalizeValue(dto.description),
          keywords: normalizeValue(dto.keywords),
        },
      });
      const item = this.toItem(key, record);
      try {
        await this.redisService.del(this.cacheKey(key));
      } catch (error) {
        this.logger.warn(`Failed to clear SEO settings cache: ${(error as Error).message}`);
      }
      return item;
    } catch (error) {
      if (isMissingSeoTable(error)) {
        throw new ServiceUnavailableException('SEO settings are not initialized.');
      }
      throw error;
    }
  }
}
