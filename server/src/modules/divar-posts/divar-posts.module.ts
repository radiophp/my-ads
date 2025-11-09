import { Module } from '@nestjs/common';
import { DivarPostHarvestService } from './divar-post-harvest.service';
import { DivarPostFetchService } from './divar-post-fetch.service';
import { DivarPostsAdminService } from './divar-posts-admin.service';
import { DivarPostsAdminController } from './divar-posts-admin.controller';

@Module({
  providers: [DivarPostHarvestService, DivarPostFetchService, DivarPostsAdminService],
  exports: [DivarPostHarvestService, DivarPostFetchService],
  controllers: [DivarPostsAdminController],
})
export class DivarPostsModule {}
