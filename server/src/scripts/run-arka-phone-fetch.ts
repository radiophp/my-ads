import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { ArkaPhoneFetchService } from '@app/modules/arka/arka-phone-fetch.service';

async function bootstrap() {
  const logger = new Logger('ArkaPhoneFetchScript');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const service = app.get(ArkaPhoneFetchService);
  const maxPages = Number(process.env['MAX_PAGE']) || 10;

  logger.log(`_____ arka phone fetch: search-based start (maxPages=${maxPages}) _____`);

  const summary = await service.fetchFromSearchPages(maxPages);

  logger.log('_____ arka phone fetch: done _____');
  logger.log(
    `Summary: ${summary.processed} processed, ${summary.stored} stored, ${summary.refetched} refetched, ${summary.skipped} skipped, ${summary.errors} errors`,
  );

  await app.close();
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
