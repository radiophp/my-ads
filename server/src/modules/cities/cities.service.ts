import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ConfigType } from '@nestjs/config';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';
import cacheConfig from '@app/platform/config/cache.config';

const CITY_CACHE_TTL_MS = 60 * 60 * 1000;
type CityRecord = Prisma.CityGetPayload<{ include: { province: true } }>;

@Injectable()
export class CitiesService {
  private readonly logger = new Logger(CitiesService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    @Inject(cacheConfig.KEY)
    private readonly cacheCfg: ConfigType<typeof cacheConfig>,
  ) {}

  async findAll(provinceId?: number): Promise<CityRecord[]> {
    const cacheKey = `locations:cities:province:${provinceId ?? 'all'}`;
    if (this.cacheCfg.enabled) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        if (process.env['NODE_ENV'] !== 'production') {
          this.logger.log(`Cache HIT: ${cacheKey}`);
        }
        return JSON.parse(cached) as CityRecord[];
      }
    }

    const cities = await this.prismaService.city.findMany({
      where: provinceId ? { provinceId } : undefined,
      orderBy: { name: 'asc' },
      include: { province: true },
    });
    if (this.cacheCfg.enabled) {
      await this.redisService.pSetEx(cacheKey, CITY_CACHE_TTL_MS, JSON.stringify(cities));
    }
    return cities;
  }

  async updateAllowPosting(id: number, allowPosting: boolean) {
    const result = await this.prismaService.city.update({
      where: { id },
      data: { allowPosting },
      include: { province: true },
    });

    if (this.cacheCfg.enabled) {
      const provinceKey = `locations:cities:province:${result.provinceId}`;
      await this.redisService.del(`locations:cities:province:all`);
      await this.redisService.del(provinceKey);
      if (process.env['NODE_ENV'] !== 'production') {
        this.logger.log(`Cache INVALIDATED: locations:cities:province:all, ${provinceKey}`);
      }
    }

    return result;
  }
}
