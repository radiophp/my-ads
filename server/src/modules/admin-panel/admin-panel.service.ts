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
  adminArkaSessions: number;
  news: number;
  newsCategories: number;
  newsTags: number;
  newsSources: number;
  blog: number;
  blogCategories: number;
  blogTags: number;
  blogSources: number;
  slides: number;
  featuredPosts: number;
  seoSettings: number;
  websiteSettings: number;
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
      adminArkaSessions,
      news,
      newsCategories,
      newsTags,
      newsSources,
      blog,
      blogCategories,
      blogTags,
      blogSources,
      slides,
      featuredPosts,
      seoSettings,
      websiteSettings,
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
      this.prisma.adminArkaSession.count(),
      this.prisma.news.count(),
      this.prisma.newsCategory.count(),
      this.prisma.newsTag.count(),
      this.prisma.newsSource.count(),
      this.prisma.blog.count(),
      this.prisma.blogCategory.count(),
      this.prisma.blogTag.count(),
      this.prisma.blogSource.count(),
      this.prisma.slide.count(),
      this.prisma.featuredPost.count(),
      this.prisma.seoSetting.count(),
      this.prisma.websiteSetting.count(),
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
      adminArkaSessions,
      news,
      newsCategories,
      newsTags,
      newsSources,
      blog,
      blogCategories,
      blogTags,
      blogSources,
      slides,
      featuredPosts,
      seoSettings,
      websiteSettings,
    };
  }
}
