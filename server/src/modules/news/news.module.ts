import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsCrawlerService } from './news-crawler.service';
import { KhabarCrawlerService } from './khabar-crawler.service';
import { AsriranCrawlerService } from './asriran-crawler.service';
import { NewsController } from './news.controller';
import { AdminNewsController } from './admin-news.controller';
import { AdminNewsCategoriesController } from './admin-news-categories.controller';
import { AdminNewsTagsController } from './admin-news-tags.controller';
import { AdminNewsSourcesController } from './admin-news-sources.controller';

@Module({
  controllers: [
    NewsController,
    AdminNewsController,
    AdminNewsCategoriesController,
    AdminNewsTagsController,
    AdminNewsSourcesController,
  ],
  providers: [NewsService, NewsCrawlerService, KhabarCrawlerService, AsriranCrawlerService],
  exports: [NewsService],
})
export class NewsModule {}
