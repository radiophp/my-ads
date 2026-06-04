import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@app/app.module';
import { MelkradarToDivarService } from '@app/modules/melkradar/melkradar-to-divar.service';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BATCH_CONCURRENCY = parseInt(process.env['BATCH_CONCURRENCY'] ?? '5', 10);
const BATCH_LIMIT = process.env['BATCH_LIMIT']
  ? parseInt(process.env['BATCH_LIMIT'], 10)
  : Infinity;

const ERROR_LOG_DIR = join(__dirname, '..', '..', 'tmp');
const ERROR_LOG_FILE = join(ERROR_LOG_DIR, `melkradar-skip-errors-${Date.now()}.log`);

function logError(result: { id?: string; error?: string }): void {
  if (!result.error) return;

  const lines: string[] = [`--- SKIPPED ${result.id} ---`, result.error];

  const match = result.error.match(/cityAreaTitle="([^"]+)"/);
  if (match) {
    lines.push(`area: ${match[1]}`);
  }

  const catMatch = result.error.match(/group="([^"]+)".*adverType="([^"]+)".*estateType="([^"]+)"/);
  if (catMatch) {
    lines.push(`cat: group=${catMatch[1]} adverType=${catMatch[2]} estateType=${catMatch[3]}`);
  }

  lines.push('');
  appendFileSync(ERROR_LOG_FILE, lines.join('\n'));
}

async function bootstrap(): Promise<void> {
  if (!existsSync(ERROR_LOG_DIR)) {
    mkdirSync(ERROR_LOG_DIR, { recursive: true });
  }
  appendFileSync(
    ERROR_LOG_FILE,
    `MelkRadar skip errors — ${new Date().toISOString()}\n${'='.repeat(60)}\n`,
  );

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('MelkradarToDivar');

  try {
    const service = app.get(MelkradarToDivarService);

    let total = 0;
    let failed = 0;
    const skipIds = new Set<string>();

    while (total < BATCH_LIMIT) {
      const remaining =
        BATCH_LIMIT === Infinity
          ? BATCH_CONCURRENCY
          : Math.min(BATCH_CONCURRENCY, BATCH_LIMIT - total);
      const results = await service.processBatch(remaining, skipIds);

      if (results.length === 0) {
        logger.log('All done — no more unprocessed MelkRadar posts.');
        break;
      }

      for (const result of results) {
        if (result.error) {
          failed++;
          logger.warn(`[${total + 1}] SKIPPED ${result.id} — ${result.error}`);
          logError(result);
          skipIds.add(result.id!);
        } else {
          logger.log(`[${total + 1}] OK ${result.id} — ${result.title ?? '(no title)'}`);
        }
        total++;
      }

      if (total >= BATCH_LIMIT && BATCH_LIMIT !== Infinity) {
        logger.log(`Reached BATCH_LIMIT=${BATCH_LIMIT}. Run again to continue.`);
      }
    }

    logger.log(`Finished — ${total} processed, ${failed} skipped`);
    if (failed > 0) {
      logger.log(`Skip errors saved to ${ERROR_LOG_FILE}`);
    }
  } catch (error) {
    logger.error('Script failed', error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void bootstrap();
