import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsCrawlerService } from './news-crawler.service';
import { NewsController } from './news.controller';
import { AdminNewsController } from './admin-news.controller';
import { AdminNewsCategoriesController } from './admin-news-categories.controller';
import { AdminNewsTagsController } from './admin-news-tags.controller';

@Module({
  controllers: [
    NewsController,
    AdminNewsController,
    AdminNewsCategoriesController,
    AdminNewsTagsController,
  ],
  providers: [NewsService, NewsCrawlerService],
  exports: [NewsService],
})
export class NewsModule {}
