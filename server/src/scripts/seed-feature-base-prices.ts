import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { FeatureBasePriceService } from '@app/modules/packages/feature-base-price.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('SeedFeatureBasePrices');

  try {
    const service = app.get(FeatureBasePriceService);
    await service.seedFromConstants();
    logger.log('Feature base prices seeded successfully.');
  } catch (error) {
    logger.error(
      'Failed to seed feature base prices',
      error instanceof Error ? error.stack : error,
    );
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
