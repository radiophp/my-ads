import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/platform/database/prisma.module';
import { DivarCategoriesService } from './divar-categories.service';
import { DivarCategoriesController } from './divar-categories.controller';

@Module({
  imports: [PrismaModule],
  providers: [DivarCategoriesService],
  controllers: [DivarCategoriesController],
  exports: [DivarCategoriesService],
})
export class DivarCategoriesModule {}
