import { Injectable } from '@nestjs/common';

import { PrismaService } from '@app/platform/database/prisma.service';

type FindAllFilters = {
  cityId?: number;
  cityIds?: number[];
  provinceId?: number;
};

@Injectable()
export class DistrictsService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll({ cityId, cityIds, provinceId }: FindAllFilters = {}) {
    const normalizedCityIds =
      cityIds?.filter((id): id is number => typeof id === 'number' && Number.isFinite(id)) ?? [];
    const cityFilter =
      normalizedCityIds.length > 0
        ? { cityId: { in: normalizedCityIds } }
        : cityId
          ? { cityId }
          : {};

    return this.prismaService.district.findMany({
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
  }
}
