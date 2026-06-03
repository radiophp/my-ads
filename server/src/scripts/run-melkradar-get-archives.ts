import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { MelkradarArchiveService } from '@app/modules/melkradar/melkradar-archive.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('MelkradarGetArchivesScript');

  try {
    const service = app.get(MelkradarArchiveService);
    const result = await service.fetchAndStoreArchives();
    logger.log(`Archives sync complete — ${result.stored} new, ${result.skipped} updated`);
  } catch (error) {
    logger.error('Failed to fetch Melkradar archives', error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
