import { Module } from '@nestjs/common';
import { FeaturedPostsController } from './featured-posts.controller';
import { AdminFeaturedPostsController } from './admin-featured-posts.controller';
import { FeaturedPostsService } from './featured-posts.service';
import { DivarPostsModule } from '@app/modules/divar-posts/divar-posts.module';

@Module({
  imports: [DivarPostsModule],
  controllers: [FeaturedPostsController, AdminFeaturedPostsController],
  providers: [FeaturedPostsService],
  exports: [FeaturedPostsService],
})
export class FeaturedPostsModule {}
