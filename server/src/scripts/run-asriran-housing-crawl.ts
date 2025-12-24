import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { AsriranCrawlerService } from '@app/modules/news/asriran-crawler.service';

async function bootstrap() {
  const logger = new Logger('AsriranHousingCrawlScript');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const service = app.get(AsriranCrawlerService);
  logger.log('_____ asriran housing crawl: start _____');
  await service.crawlTags();
  logger.log('_____ asriran housing crawl: done _____');
  await app.close();
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
