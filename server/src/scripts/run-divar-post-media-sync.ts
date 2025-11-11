import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { DivarPostMediaSyncService } from '@app/modules/divar-posts/divar-post-media-sync.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('DivarPostMediaSyncScript');

  try {
    const syncService = app.get(DivarPostMediaSyncService);
    await syncService['syncNextBatch']();
    logger.log('Manual Divar media sync finished.');
  } catch (error) {
    logger.error('Divar media sync failed', error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
