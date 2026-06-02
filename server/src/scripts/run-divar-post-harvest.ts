import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { DivarPostHarvestService } from '@app/modules/divar-posts/divar-post-harvest.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('DivarPostHarvestScript');

  try {
    const harvester = app.get(DivarPostHarvestService);
    const result = await harvester.harvestAllowedScopes();
    logger.log(
      `Manual harvest enqueued ${result.enqueued} posts across ${result.combinations} combinations (${result.locations} locations × ${result.categories} categories).`,
    );
  } catch (error) {
    logger.error('Divar post harvest failed', error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
