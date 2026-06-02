import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { DivarCategoriesService } from '@app/modules/divar-categories/divar-categories.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('DivarCategorySyncScript');

  try {
    const service = app.get(DivarCategoriesService);
    const result = await service.syncCategoriesFromApi();
    logger.log(
      `Sync completed. Total: ${result.total}, created: ${result.created}, updated: ${result.updated}, deactivated: ${result.deactivated}`,
    );
  } catch (error) {
    logger.error('Failed to sync Divar categories', error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
