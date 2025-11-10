import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('CronScheduler');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  logger.log('Cron scheduler is running (application context initialized). Press Ctrl+C to exit.');

  await new Promise<void>((resolve) => {
    const handleShutdown = (signal: NodeJS.Signals) => {
      logger.log(`Received ${signal}. Closing cron scheduler...`);
      void app
        .close()
        .then(() => {
          logger.log('Cron scheduler shutdown complete.');
          resolve();
        })
        .catch((error) => {
          logger.error(
            'Failed to shutdown cron scheduler cleanly',
            error instanceof Error ? error.stack : String(error),
          );
          resolve();
        });
    };

    process.once('SIGINT', () => handleShutdown('SIGINT'));
    process.once('SIGTERM', () => handleShutdown('SIGTERM'));
  });
}

bootstrap().catch((error) => {
  const logger = new Logger('CronScheduler');
  logger.error('Cron scheduler failed to start', error instanceof Error ? error.stack : error);
  process.exit(1);
});
