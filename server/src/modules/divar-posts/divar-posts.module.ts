import { Module } from '@nestjs/common';
import { DivarPostHarvestService } from './divar-post-harvest.service';
import { DivarPostFetchService } from './divar-post-fetch.service';
import { DivarPostsAdminService } from './divar-posts-admin.service';
import { DivarPostsAdminController } from './divar-posts-admin.controller';
import { DivarPostsController } from './divar-posts.controller';
import { DivarPostAnalyzeService } from './divar-post-analyze.service';

@Module({
  providers: [
    DivarPostHarvestService,
    DivarPostFetchService,
    DivarPostAnalyzeService,
    DivarPostsAdminService,
  ],
  exports: [DivarPostHarvestService, DivarPostFetchService, DivarPostAnalyzeService],
  controllers: [DivarPostsAdminController, DivarPostsController],
})
export class DivarPostsModule {}
