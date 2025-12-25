import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';

const CITY_CACHE_TTL_MS = 60 * 60 * 1000;
type CityRecord = Prisma.CityGetPayload<{ include: { province: true } }>;

@Injectable()
export class CitiesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async findAll(provinceId?: number): Promise<CityRecord[]> {
    const cacheKey = `locations:cities:province:${provinceId ?? 'all'}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as CityRecord[];
    }

    const cities = await this.prismaService.city.findMany({
      where: provinceId ? { provinceId } : undefined,
      orderBy: { name: 'asc' },
      include: { province: true },
    });
    await this.redisService.pSetEx(cacheKey, CITY_CACHE_TTL_MS, JSON.stringify(cities));
    return cities;
  }

  updateAllowPosting(id: number, allowPosting: boolean) {
    return this.prismaService.city.update({
      where: { id },
      data: { allowPosting },
      include: { province: true },
    });
  }
}
