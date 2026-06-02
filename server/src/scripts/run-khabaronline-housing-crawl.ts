import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { KhabarCrawlerService } from '@app/modules/news/khabar-crawler.service';

async function bootstrap() {
  const logger = new Logger('KhabaronlineHousingCrawlScript');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const service = app.get(KhabarCrawlerService);
  logger.log('_____ khabaronline housing crawl: start _____');
  await service.crawlFeed();
  logger.log('_____ khabaronline housing crawl: done _____');
  await app.close();
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
