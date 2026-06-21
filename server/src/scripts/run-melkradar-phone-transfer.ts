import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { MelkradarPhoneTransferService } from '@app/modules/melkradar/melkradar-phone-transfer.service';

async function bootstrap() {
  const logger = new Logger('MelkradarPhoneTransferScript');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const service = app.get(MelkradarPhoneTransferService);
  logger.log('_____ melkradar phone transfer: start _____');

  while (true) {
    const bulk = await service.transferMissingPosts(true).catch((error) => {
      logger.error(
        `MelkRadar bulk transfer failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    });
    if (!bulk || bulk.kind === 'skipped') {
      break;
    }
    if (bulk.kind === 'transferred') {
      logger.log(`MelkRadar bulk transfer applied to ${bulk.count} posts.`);
      continue;
    }
  }

  while (true) {
    const result = await service.transferOne(true).catch((error) => {
      logger.error(
        `MelkRadar transfer failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    });
    if (!result || result.kind === 'skipped') {
      break;
    }
    if (result.kind === 'transferred') {
      logger.log(
        `MelkRadar transfer applied: externalId=${result.externalId} phone=${result.phone ?? 'n/a'}`,
      );
    } else if (result.kind === 'deferred') {
      logger.warn(
        `MelkRadar transfer deferred (${result.reason})${
          result.until ? ` until ${result.until.toISOString()}` : ''
        }`,
      );
      break;
    } else if (result.kind === 'error') {
      logger.warn(`MelkRadar transfer error: ${result.reason}`);
      break;
    }
  }
  logger.log('_____ melkradar phone transfer: done _____');
  await app.close();
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
