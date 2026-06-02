import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { DivarContactFetchService } from '@app/modules/divar-posts/divar-contact-fetch.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('DivarContactFetchScript');

  try {
    const contactFetcher = app.get(DivarContactFetchService);
    const processed = await contactFetcher.tick();
    if (processed) {
      logger.log(
        `Divar contact fetch tick executed for post ${processed.id}${
          processed.title ? ` (${processed.title})` : ''
        }.`,
      );
    } else {
      logger.log('Divar contact fetch tick executed (no eligible post).');
    }
  } catch (error) {
    logger.error(
      'Divar contact fetch failed',
      error instanceof Error ? error.stack : String(error),
    );
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
