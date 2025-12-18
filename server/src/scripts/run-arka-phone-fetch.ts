import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { ArkaPhoneFetchService } from '@app/modules/arka/arka-phone-fetch.service';
import { PrismaService } from '@app/platform/database/prisma.service';

async function bootstrap() {
  const logger = new Logger('ArkaPhoneFetchScript');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const prisma = app.get(PrismaService);
  const service = app.get(ArkaPhoneFetchService);
  const START_ID = 19015;
  const latestId = await service.fetchLatestArkaId();
  if (typeof latestId !== 'number' || !Number.isFinite(latestId)) {
    logger.error('Unable to determine latest Arka id; aborting.');
    await app.close();
    return;
  }
  const MAX_ID = latestId;

  // Ensure cursor initialized and at least START_ID
  await prisma.$transaction(async (tx) => {
    const cursor = await tx.arkaPhoneCursor.findUnique({ where: { id: 'singleton' } });
    if (!cursor) {
      await tx.arkaPhoneCursor.create({
        data: { id: 'singleton', nextFetchId: START_ID, updatedAt: new Date() },
      });
      return;
    }
    if (cursor.nextFetchId < START_ID) {
      await tx.arkaPhoneCursor.update({
        where: { id: 'singleton' },
        data: { nextFetchId: START_ID, updatedAt: new Date() },
      });
    }
  });

  logger.log(`_____ arka phone fetch: start (maxId=${MAX_ID}) _____`);

  while (true) {
    const cursor = await prisma.arkaPhoneCursor.findUnique({ where: { id: 'singleton' } });
    const nextId = cursor?.nextFetchId ?? START_ID;
    if (nextId >= MAX_ID) {
      logger.log(`Reached max id ${MAX_ID}. Stopping.`);
      break;
    }

    const batch = Array.from({ length: 10 }).map(() =>
      service.fetchNext(true).catch((error) => {
        logger.error(
          `Arka fetch failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      }),
    );

    const results = await Promise.all(batch);
    let progress = false;
    let waitMs = 0;

    for (const result of results) {
      if (!result) {
        continue;
      }
      if (result.kind === 'stored') {
        progress = true;
        logger.log(
          `Arka fetch stored: arkaId=${result.arkaId} externalId=${result.externalId ?? 'n/a'}`,
        );
      } else if (result.kind === 'backoff') {
        const candidateWait = Math.max(1000, result.until.getTime() - Date.now());
        waitMs = Math.max(waitMs, candidateWait);
        logger.warn(`Arka fetch backoff (${result.reason}) waiting ${candidateWait}ms`);
      } else if (result.kind === 'skipped') {
        if (result.reason === 'not_found') {
          progress = true; // cursor advanced
        } else {
          waitMs = Math.max(waitMs, 200);
          logger.debug(`Arka fetch skipped: ${result.reason}`);
        }
      } else if (result.kind === 'error') {
        waitMs = Math.max(waitMs, 1000);
        logger.warn(`Arka fetch error: ${result.reason}`);
      }
    }

    if (waitMs > 0) {
      await sleep(waitMs);
    } else if (!progress) {
      await sleep(200);
    }
  }
  logger.log('_____ arka phone fetch: done _____');
  await app.close();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
