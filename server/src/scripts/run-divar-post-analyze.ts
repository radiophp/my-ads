import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { DivarPostAnalyzeService } from '@app/modules/divar-posts/divar-post-analyze.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('DivarPostAnalyzeScript');

  try {
    const analyzer = app.get(DivarPostAnalyzeService);
    const summary = await analyzer.processPendingJobs(1000);
    logger.log(
      `Divar post analysis completed: processed=${summary.processed} failed=${summary.failed}.`,
    );
  } catch (error) {
    logger.error('Divar post analysis failed', error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
