import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { BusinessTitleRefreshService } from '@app/modules/phone-fetch/business-title-refresh.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('BusinessTitleRefreshScript');

  try {
    const refresher = app.get(BusinessTitleRefreshService);
    logger.log('_____ business title refresh: start _____');
    const result = await refresher.refreshOne(true);
    if (result) {
      logger.log(
        `Business title refresh executed: business=${result.businessRef} _ title="${result.title ?? '—'}".`,
      );
    } else {
      logger.log('Business title refresh executed _ no eligible business.');
    }
    logger.log('_____ business title refresh: done _____');
  } catch (error) {
    logger.error(
      'Business title refresh failed',
      error instanceof Error ? error.stack : String(error),
    );
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
