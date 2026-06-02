import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { DivarPostFetchService } from '@app/modules/divar-posts/divar-post-fetch.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('DivarPostFetchScript');

  try {
    const service = app.get(DivarPostFetchService);
    const result = await service.fetchNextPosts();
    logger.log(
      `Manual fetch processed ${result.attempted} posts (success: ${result.succeeded}, failed: ${result.failed}).`,
    );
  } catch (error) {
    logger.error('Divar post fetch failed', error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
