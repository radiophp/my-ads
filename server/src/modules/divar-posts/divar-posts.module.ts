import { Module } from '@nestjs/common';
import { StorageModule } from '@app/platform/storage/storage.module';
import { DivarPostHarvestService } from './divar-post-harvest.service';
import { DivarPostFetchService } from './divar-post-fetch.service';
import { DivarPostsAdminService } from './divar-posts-admin.service';
import { DivarPostsAdminController } from './divar-posts-admin.controller';
import { DivarPostsController } from './divar-posts.controller';
import { DivarPostAnalyzeService } from './divar-post-analyze.service';
import { DivarPostMediaSyncService } from './divar-post-media-sync.service';
import { DivarContactFetchService } from './divar-contact-fetch.service';
import { AdminDivarSessionsModule } from '../admin-divar-sessions/admin-divar-sessions.module';
import { DivarPostStatsService } from './divar-post-stats.service';

@Module({
  imports: [StorageModule, AdminDivarSessionsModule],
  providers: [
    DivarPostHarvestService,
    DivarPostFetchService,
    DivarPostAnalyzeService,
    DivarPostsAdminService,
    DivarPostMediaSyncService,
    DivarContactFetchService,
    DivarPostStatsService,
  ],
  exports: [
    DivarPostHarvestService,
    DivarPostFetchService,
    DivarPostAnalyzeService,
    DivarPostsAdminService,
    DivarContactFetchService,
    DivarPostStatsService,
  ],
  controllers: [DivarPostsAdminController, DivarPostsController],
})
export class DivarPostsModule {}
