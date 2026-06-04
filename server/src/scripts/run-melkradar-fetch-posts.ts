import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { MelkradarPostService } from '@app/modules/melkradar/melkradar-post.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('MelkradarFetchPostsScript');

  try {
    const service = app.get(MelkradarPostService);
    const result = await service.fetchAllArchives();
    logger.log(
      `Fetch complete — ${result.totalFetched} posts, ${result.archivesCompleted} archives done`,
    );
  } catch (error) {
    logger.error('Failed to fetch Melkradar posts', error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
