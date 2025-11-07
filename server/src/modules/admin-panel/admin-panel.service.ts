import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';

export type AdminEntityCounts = {
  packages: number;
  provinces: number;
  cities: number;
  districts: number;
  divarCategories: number;
  divarCategoryFilters: number;
};

@Injectable()
export class AdminPanelService {
  constructor(private readonly prisma: PrismaService) {}

  async getEntityCounts(): Promise<AdminEntityCounts> {
    const [packages, provinces, cities, districts, divarCategories, divarCategoryFilters] =
      await Promise.all([
        this.prisma.subscriptionPackage.count(),
        this.prisma.province.count(),
        this.prisma.city.count(),
        this.prisma.district.count(),
        this.prisma.divarCategory.count({ where: { isActive: true } }),
        this.prisma.divarCategoryFilter.count(),
      ]);

    return { packages, provinces, cities, districts, divarCategories, divarCategoryFilters };
  }
}
