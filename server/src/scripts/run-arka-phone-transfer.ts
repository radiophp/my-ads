import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { ArkaPhoneTransferService } from '@app/modules/arka/arka-phone-transfer.service';

async function bootstrap() {
  const logger = new Logger('ArkaPhoneTransferScript');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const service = app.get(ArkaPhoneTransferService);
  logger.log('_____ arka phone transfer: start _____');
  // Process until no more matching posts without phone numbers
  // First apply targeted bulk transfers for missing posts
  // then fall back to single transferOne for any remaining NOT_TRANSFERRED records.
  while (true) {
    const bulk = await service.transferMissingPosts(true).catch((error) => {
      logger.error(
        `Arka bulk transfer failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    });
    if (!bulk || bulk.kind === 'skipped') {
      break;
    }
    if (bulk.kind === 'transferred') {
      logger.log(`Arka bulk transfer applied to ${bulk.count} posts.`);
      continue;
    }
  }

  while (true) {
    const result = await service.transferOne(true).catch((error) => {
      logger.error(
        `Arka transfer failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    });
    if (!result || result.kind === 'skipped') {
      break;
    }
    if (result.kind === 'transferred') {
      logger.log(
        `Arka transfer applied: externalId=${result.externalId} phone=${result.phone ?? 'n/a'}`,
      );
    } else if (result.kind === 'deferred') {
      logger.warn(
        `Arka transfer deferred (${result.reason})${
          result.until ? ` until ${result.until.toISOString()}` : ''
        }`,
      );
      break;
    } else if (result.kind === 'error') {
      logger.warn(`Arka transfer error: ${result.reason}`);
      break;
    }
  }
  logger.log('_____ arka phone transfer: done _____');
  await app.close();
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
