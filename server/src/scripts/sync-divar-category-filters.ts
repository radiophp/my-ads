import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { DivarCategoryFiltersService } from '@app/modules/divar-categories/divar-category-filters.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('DivarCategoryFiltersSyncScript');

  try {
    const service = app.get(DivarCategoryFiltersService);
    const result = await service.syncFiltersFromApi();
    logger.log(
      `Filter sync completed. Total: ${result.total}, created: ${result.created}, updated: ${result.updated}, failed: ${result.failed.length}`,
    );

    if (result.failed.length > 0) {
      result.failed.forEach((failure) =>
        logger.error(`Failed to sync "${failure.slug}": ${failure.reason}`),
      );
      process.exitCode = 1;
    }
  } catch (error) {
    logger.error(
      'Failed to sync Divar category filters',
      error instanceof Error ? error.stack : error,
    );
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
