import { Injectable } from '@nestjs/common';

import { PrismaService } from '@app/platform/database/prisma.service';

type FindAllFilters = {
  cityId?: number;
  provinceId?: number;
};

@Injectable()
export class DistrictsService {
  constructor(private readonly prismaService: PrismaService) {}

  findAll({ cityId, provinceId }: FindAllFilters = {}) {
    return this.prismaService.district.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
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
