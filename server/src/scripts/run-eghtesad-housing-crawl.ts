import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { NewsCrawlerService } from '@app/modules/news/news-crawler.service';

async function bootstrap() {
  const logger = new Logger('EghtesadHousingCrawlScript');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const service = app.get(NewsCrawlerService);
  logger.log('_____ eghtesad housing crawl: start _____');
  await service.crawlFeed();
  logger.log('_____ eghtesad housing crawl: done _____');
  await app.close();
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
