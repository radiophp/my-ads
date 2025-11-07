import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { DivarCategoriesService } from './divar-categories.service';
import { DivarCategoriesController } from './divar-categories.controller';
import { DivarCategoryFiltersService } from './divar-category-filters.service';
import {
  DivarCategoryFiltersController,
  AdminDivarCategoryFiltersController,
} from './divar-category-filters.controller';

@Module({
  imports: [PrismaModule],
  providers: [DivarCategoriesService, DivarCategoryFiltersService],
  controllers: [
    DivarCategoriesController,
    DivarCategoryFiltersController,
    AdminDivarCategoryFiltersController,
  ],
  exports: [DivarCategoriesService, DivarCategoryFiltersService],
})
export class DivarCategoriesModule {}
