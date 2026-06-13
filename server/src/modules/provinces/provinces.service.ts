import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';
import cacheConfig from '@app/platform/config/cache.config';

const PROVINCE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ProvincesService {
  private readonly logger = new Logger(ProvincesService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    @Inject(cacheConfig.KEY)
    private readonly cacheCfg: ConfigType<typeof cacheConfig>,
  ) {}

  async findAll() {
    const cacheKey = 'locations:provinces:all';
    if (this.cacheCfg.enabled) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        if (process.env['NODE_ENV'] !== 'production') {
          this.logger.log(`Cache HIT: ${cacheKey}`);
        }
        return JSON.parse(cached);
      }
    }

    const provinces = await this.prismaService.province.findMany({
      orderBy: { name: 'asc' },
    });

    if (this.cacheCfg.enabled) {
      await this.redisService.pSetEx(cacheKey, PROVINCE_CACHE_TTL_MS, JSON.stringify(provinces));
    }

    return provinces;
  }

  async updateAllowPosting(id: number, allowPosting: boolean) {
    const result = await this.prismaService.$transaction(async (tx) => {
      const province = await tx.province.update({
        where: { id },
        data: { allowPosting },
      });

      await tx.city.updateMany({
        where: { provinceId: id },
        data: { allowPosting },
      });

      return province;
    });

    if (this.cacheCfg.enabled) {
      await this.redisService.del('locations:provinces:all');
      await this.redisService.delPattern('locations:cities:province:*');
      if (process.env['NODE_ENV'] !== 'production') {
        this.logger.log('Cache INVALIDATED: locations:provinces:all, locations:cities:province:*');
      }
    }

    return result;
  }
}
