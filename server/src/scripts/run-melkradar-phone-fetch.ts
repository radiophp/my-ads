import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { MelkradarPhoneFetchService } from '@app/modules/melkradar/melkradar-phone-fetch.service';

async function bootstrap() {
  const logger = new Logger('MelkradarPhoneFetchScript');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const service = app.get(MelkradarPhoneFetchService);
  const maxPages = Number(process.env['MAX_PAGE']) || 10;

  logger.log(`_____ melkradar phone fetch: start (maxPages=${maxPages}) _____`);

  const summary = await service.fetchFromListingPages(maxPages);

  logger.log('_____ melkradar phone fetch: done _____');
  logger.log(
    `Summary: ${summary.processed} processed, ${summary.stored} stored, ${summary.skipped} skipped, ${summary.errors} errors`,
  );

  await app.close();
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
