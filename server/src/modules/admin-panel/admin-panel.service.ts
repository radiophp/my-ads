import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import { PostAnalysisStatus } from '@prisma/client';

export type AdminEntityCounts = {
  packages: number;
  provinces: number;
  cities: number;
  districts: number;
  divarCategories: number;
  divarCategoryFilters: number;
  postsToAnalyzePending: number;
  notifications: number;
  adminDivarSessions: number;
};

@Injectable()
export class AdminPanelService {
  constructor(private readonly prisma: PrismaService) {}

  async getEntityCounts(): Promise<AdminEntityCounts> {
    const [
      packages,
      provinces,
      cities,
      districts,
      divarCategories,
      divarCategoryFilters,
      postsToAnalyzePending,
      notifications,
      adminDivarSessions,
    ] = await Promise.all([
      this.prisma.subscriptionPackage.count(),
      this.prisma.province.count(),
      this.prisma.city.count(),
      this.prisma.district.count(),
      this.prisma.divarCategory.count({ where: { isActive: true } }),
      this.prisma.divarCategoryFilter.count(),
      this.prisma.postToAnalyzeQueue.count({
        where: { status: PostAnalysisStatus.PENDING },
      }),
      this.prisma.notification.count(),
      this.prisma.adminDivarSession.count(),
    ]);

    return {
      packages,
      provinces,
      cities,
      districts,
      divarCategories,
      divarCategoryFilters,
      postsToAnalyzePending,
      notifications,
      adminDivarSessions,
    };
  }
}
