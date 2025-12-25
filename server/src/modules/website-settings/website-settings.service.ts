import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';
import { WEBSITE_SETTINGS_KEY } from './website-settings.constants';
import { UpdateWebsiteSettingsDto } from './dto/update-website-settings.dto';

const isMissingWebsiteTable = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';

const WEBSITE_SETTINGS_CACHE_KEY = 'website-settings:public';
const WEBSITE_SETTINGS_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_PHONE_CONTACTS = 5;

type WebsiteContact = {
  name: string;
  phone: string;
};

type WebsiteSettingRecord = {
  key: string;
  phoneContacts: Prisma.JsonValue | null;
  instagramUrl: string | null;
  telegramChannelUrl: string | null;
  telegramBotUrl: string | null;
  aboutDescription: string | null;
  address: string | null;
  updatedAt: Date;
};

export type WebsiteSettingsItem = {
  key: string;
  phoneContacts: WebsiteContact[];
  instagramUrl: string | null;
  telegramChannelUrl: string | null;
  telegramBotUrl: string | null;
  aboutDescription: string | null;
  address: string | null;
  updatedAt?: Date;
};

const normalizeValue = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeContacts = (value?: WebsiteContact[]): WebsiteContact[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => ({
      name: entry?.name?.trim() ?? '',
      phone: entry?.phone?.trim() ?? '',
    }))
    .filter((entry) => entry.name.length > 0 && entry.phone.length > 0)
    .slice(0, MAX_PHONE_CONTACTS);
};

const parseContacts = (value: Prisma.JsonValue | null): WebsiteContact[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      const contact = typeof entry === 'object' && entry ? (entry as WebsiteContact) : null;
      return {
        name: String(contact?.name ?? ''),
        phone: String(contact?.phone ?? ''),
      };
    })
    .filter((entry) => entry.name && entry.phone)
    .slice(0, MAX_PHONE_CONTACTS);
};

@Injectable()
export class WebsiteSettingsService {
  private readonly logger = new Logger(WebsiteSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private ensureKey(key: string): string {
    if (key !== WEBSITE_SETTINGS_KEY) {
      throw new BadRequestException('Invalid website settings key.');
    }
    return key;
  }

  private toItem(record?: WebsiteSettingRecord | null): WebsiteSettingsItem {
    return {
      key: WEBSITE_SETTINGS_KEY,
      phoneContacts: parseContacts(record?.phoneContacts ?? null),
      instagramUrl: record?.instagramUrl ?? null,
      telegramChannelUrl: record?.telegramChannelUrl ?? null,
      telegramBotUrl: record?.telegramBotUrl ?? null,
      aboutDescription: record?.aboutDescription ?? null,
      address: record?.address ?? null,
      updatedAt: record?.updatedAt,
    };
  }

  private parseCached(value: string): WebsiteSettingsItem | null {
    try {
      const cached = JSON.parse(value) as WebsiteSettingsItem & { updatedAt?: string };
      return {
        ...cached,
        updatedAt: cached.updatedAt ? new Date(cached.updatedAt) : undefined,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse cached website settings: ${(error as Error).message}`);
      return null;
    }
  }

  async getPublic(): Promise<WebsiteSettingsItem> {
    const cached = await this.redisService.get(WEBSITE_SETTINGS_CACHE_KEY);
    if (cached) {
      const parsed = this.parseCached(cached);
      if (parsed) {
        return parsed;
      }
    }

    try {
      const record = await this.prisma.websiteSetting.findUnique({
        where: { key: WEBSITE_SETTINGS_KEY },
      });
      const item = this.toItem(record);
      try {
        await this.redisService.pSetEx(
          WEBSITE_SETTINGS_CACHE_KEY,
          WEBSITE_SETTINGS_CACHE_TTL_MS,
          JSON.stringify(item),
        );
      } catch (error) {
        this.logger.warn(`Failed to cache website settings: ${(error as Error).message}`);
      }
      return item;
    } catch (error) {
      if (isMissingWebsiteTable(error)) {
        return this.toItem(null);
      }
      throw error;
    }
  }

  async getAdmin(): Promise<WebsiteSettingsItem> {
    try {
      const record = await this.prisma.websiteSetting.findUnique({
        where: { key: WEBSITE_SETTINGS_KEY },
      });
      return this.toItem(record);
    } catch (error) {
      if (isMissingWebsiteTable(error)) {
        return this.toItem(null);
      }
      throw error;
    }
  }

  async upsert(dto: UpdateWebsiteSettingsDto): Promise<WebsiteSettingsItem> {
    const key = this.ensureKey(WEBSITE_SETTINGS_KEY);
    try {
      const record = await this.prisma.websiteSetting.upsert({
        where: { key },
        create: {
          key,
          phoneContacts: normalizeContacts(dto.phoneContacts as WebsiteContact[]),
          instagramUrl: normalizeValue(dto.instagramUrl),
          telegramChannelUrl: normalizeValue(dto.telegramChannelUrl),
          telegramBotUrl: normalizeValue(dto.telegramBotUrl),
          aboutDescription: normalizeValue(dto.aboutDescription),
          address: normalizeValue(dto.address),
        },
        update: {
          phoneContacts: normalizeContacts(dto.phoneContacts as WebsiteContact[]),
          instagramUrl: normalizeValue(dto.instagramUrl),
          telegramChannelUrl: normalizeValue(dto.telegramChannelUrl),
          telegramBotUrl: normalizeValue(dto.telegramBotUrl),
          aboutDescription: normalizeValue(dto.aboutDescription),
          address: normalizeValue(dto.address),
        },
      });
      const item = this.toItem(record);
      try {
        await this.redisService.del(WEBSITE_SETTINGS_CACHE_KEY);
      } catch (error) {
        this.logger.warn(`Failed to clear website settings cache: ${(error as Error).message}`);
      }
      return item;
    } catch (error) {
      if (isMissingWebsiteTable(error)) {
        throw new ServiceUnavailableException('Website settings are not initialized.');
      }
      throw error;
    }
  }
}
