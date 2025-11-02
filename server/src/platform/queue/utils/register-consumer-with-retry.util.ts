import { Logger } from '@nestjs/common';
import type { QueueService, QueueName } from '../queue.service';
import type { JsonValue } from '@app/common/types/json.type';

export type RegisterConsumerRetryOptions = {
  logger: Logger;
  maxAttempts?: number;
  baseDelayMs?: number;
  label?: string;
};

const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const registerConsumerWithRetry = async <T extends JsonValue = JsonValue>(
  queueService: QueueService,
  queueName: QueueName,
  handler: (payload: T) => Promise<void>,
  options: RegisterConsumerRetryOptions,
): Promise<void> => {
  const defaults = queueService.getConsumerRetryOptions
    ? queueService.getConsumerRetryOptions()
    : { maxAttempts: 5, baseDelayMs: 500 };
  const maxAttempts = options.maxAttempts ?? defaults.maxAttempts;
  const baseDelayMs = options.baseDelayMs ?? defaults.baseDelayMs;
  const label = options.label ?? queueName;
  const logger = options.logger;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await queueService.registerConsumer<T>(queueName, handler);
      if (attempt > 1) {
        logger.warn(`${label} consumer registered after ${attempt} attempts`);
      } else {
        logger.log(`${label} consumer registered`);
      }
      return;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const message = `Failed to register ${label} consumer (attempt ${attempt}/${maxAttempts})`;

      if (attempt === maxAttempts) {
        logger.error(message, err.stack ?? err.message);
        throw err;
      }

      logger.warn(`${message}: ${err.message}`);

      const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), 5000);
      await delay(delayMs);
    }
  }
};
