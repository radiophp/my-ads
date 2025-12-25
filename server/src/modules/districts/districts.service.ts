import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';

const DISTRICT_CACHE_TTL_MS = 60 * 60 * 1000;
type DistrictRecord = Prisma.DistrictGetPayload<{
  include: { city: { include: { province: true } } };
}>;

type FindAllFilters = {
  cityId?: number;
  cityIds?: number[];
  provinceId?: number;
};

@Injectable()
export class DistrictsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async findAll({ cityId, cityIds, provinceId }: FindAllFilters = {}): Promise<DistrictRecord[]> {
    const normalizedCityIds =
      cityIds?.filter((id): id is number => typeof id === 'number' && Number.isFinite(id)) ?? [];
    const sortedCityIds = normalizedCityIds.length > 0 ? [...normalizedCityIds].sort() : [];
    const cacheKey = `locations:districts:province:${provinceId ?? 'all'}:city:${
      cityId ?? 'all'
    }:cities:${sortedCityIds.length ? sortedCityIds.join(',') : 'all'}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as DistrictRecord[];
    }
    const cityFilter =
      normalizedCityIds.length > 0
        ? { cityId: { in: normalizedCityIds } }
        : cityId
          ? { cityId }
          : {};

    const districts = await this.prismaService.district.findMany({
      where: {
        ...cityFilter,
        ...(provinceId ? { city: { provinceId } } : {}),
      },
      include: {
        city: {
          include: {
            province: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    await this.redisService.pSetEx(cacheKey, DISTRICT_CACHE_TTL_MS, JSON.stringify(districts));
    return districts;
  }
}
