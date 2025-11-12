import { Module } from '@nestjs/common';
import { StorageModule } from '@app/platform/storage/storage.module';
import { DivarPostHarvestService } from './divar-post-harvest.service';
import { DivarPostFetchService } from './divar-post-fetch.service';
import { DivarPostsAdminService } from './divar-posts-admin.service';
import { DivarPostsAdminController } from './divar-posts-admin.controller';
import { DivarPostsController } from './divar-posts.controller';
import { DivarPostAnalyzeService } from './divar-post-analyze.service';
import { DivarPostMediaSyncService } from './divar-post-media-sync.service';

@Module({
  imports: [StorageModule],
  providers: [
    DivarPostHarvestService,
    DivarPostFetchService,
    DivarPostAnalyzeService,
    DivarPostsAdminService,
    DivarPostMediaSyncService,
  ],
  exports: [DivarPostHarvestService, DivarPostFetchService, DivarPostAnalyzeService],
  controllers: [DivarPostsAdminController, DivarPostsController],
})
export class DivarPostsModule {}
