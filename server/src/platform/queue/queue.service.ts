import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AmqpConnectionManager,
  ChannelWrapper,
  connect,
  type AmqpConnectionManagerOptions,
  Options as AmqpChannelOptions,
} from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { RabbitMQConfig } from '@app/platform/config/rabbitmq.config';
import type { JsonValue } from '@app/common/types/json.type';

export type QueueName = 'email' | 'notification' | 'notification-telegram';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly queuePrefix: string;
  private readonly assertedQueues = new Set<string>();
  private readonly connection: AmqpConnectionManager;
  private readonly channel: ChannelWrapper;
  private readonly maxConsumerRetries: number;
  private readonly consumerRetryBaseDelayMs: number;
  private readonly deadLetterQueueSuffix: string;
  private readonly retryHeaderKey = 'x-retry-count';

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<RabbitMQConfig>('rabbitmq', { infer: true });
    if (!config) {
      throw new Error('RabbitMQ configuration is missing.');
    }

    this.queuePrefix = config.queuePrefix;
    this.maxConsumerRetries = config.maxConsumerRetries;
    this.consumerRetryBaseDelayMs = config.consumerRetryDelayMs;
    this.deadLetterQueueSuffix = config.deadLetterQueueSuffix;

    const connectionOptions: AmqpConnectionManagerOptions = {
      heartbeatIntervalInSeconds: config.heartbeat,
      reconnectTimeInSeconds: config.reconnect,
    };

    this.connection = connect([config.url], connectionOptions);
    this.connection.on('connect', () => this.logger.log('Connected to RabbitMQ'));
    this.connection.on('disconnect', (error) => {
      const reason = error?.err ? error.err.message : 'unknown reason';
      this.logger.error(`Disconnected from RabbitMQ: ${reason}`);
    });

    this.channel = this.connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await channel.prefetch(config.prefetch);
      },
    });
  }

  getConsumerRetryOptions(): { maxAttempts: number; baseDelayMs: number } {
    return {
      maxAttempts: this.maxConsumerRetries,
      baseDelayMs: this.consumerRetryBaseDelayMs,
    };
  }

  private buildQueueName(name: QueueName): string {
    return `${this.queuePrefix}.${name}`;
  }

  private async ensureQueue(queueName: string): Promise<void> {
    if (this.assertedQueues.has(queueName)) {
      return;
    }

    await this.channel.addSetup(async (channel: ConfirmChannel) => {
      await channel.assertQueue(queueName, { durable: true });
    });

    this.assertedQueues.add(queueName);
  }

  async publish<T extends JsonValue = JsonValue>(
    name: QueueName,
    payload: T,
    options: AmqpChannelOptions.Publish = {},
  ): Promise<void> {
    const queueName = this.buildQueueName(name);
    await this.ensureQueue(queueName);

    const content = Buffer.from(JSON.stringify(payload));
    const published = await this.channel.sendToQueue(queueName, content, {
      persistent: true,
      contentType: 'application/json',
      ...options,
    });

    if (!published) {
      this.logger.warn(`Publish buffer for ${queueName} is full; message queued in memory.`);
    }
  }

  async registerConsumer<T extends JsonValue = JsonValue>(
    name: QueueName,
    handler: (payload: T) => Promise<void>,
  ): Promise<void> {
    const queueName = this.buildQueueName(name);
    await this.ensureQueue(queueName);

    await this.channel.addSetup(async (channel: ConfirmChannel) => {
      await channel.consume(
        queueName,
        async (message: ConsumeMessage | null) => {
          if (!message) {
            return;
          }

          try {
            const payload = JSON.parse(message.content.toString()) as T;
            await handler(payload);
            channel.ack(message);
          } catch (error) {
            this.logger.error(`Failed to process message from ${queueName}`, error as Error);
            try {
              await this.handleProcessingFailure(channel, queueName, message);
            } catch (handlerError) {
              this.logger.error(
                `Failed to handle processing failure for ${queueName}`,
                handlerError as Error,
              );
            }
          }
        },
        { noAck: false },
      );
    });
  }

  async healthCheck(): Promise<void> {
    if (!this.connection.isConnected()) {
      throw new Error('RabbitMQ connection is not established.');
    }

    await this.channel.waitForConnect();
  }

  async close(): Promise<void> {
    try {
      await this.channel.close();
    } catch (error) {
      this.logger.warn('Error closing RabbitMQ channel', error as Error);
    }

    try {
      await this.connection.close();
    } catch (error) {
      this.logger.warn('Error closing RabbitMQ connection', error as Error);
    }
  }

  private async handleProcessingFailure(
    channel: ConfirmChannel,
    queueName: string,
    message: ConsumeMessage,
  ): Promise<void> {
    const currentAttempts = this.extractAttemptCount(message);
    const nextAttempt = currentAttempts + 1;

    if (nextAttempt > this.maxConsumerRetries) {
      await this.moveToDeadLetter(channel, queueName, message, currentAttempts);
      return;
    }

    const headers = {
      ...(message.properties.headers ?? {}),
      [this.retryHeaderKey]: nextAttempt,
    };

    try {
      const options: AmqpChannelOptions.Publish = {
        ...(message.properties as AmqpChannelOptions.Publish),
        headers,
        persistent: true,
        contentType: message.properties.contentType ?? 'application/json',
      };

      const requeued = channel.sendToQueue(queueName, message.content, options);
      if (!requeued) {
        this.logger.warn(
          `Requeue buffer for ${queueName} is full; message retained in memory until broker drains.`,
        );
      }

      this.safeAck(channel, message, `requeue ${queueName}`);
      this.logger.warn(
        `Requeued message from ${queueName}; attempt ${nextAttempt}/${this.maxConsumerRetries}.`,
      );
    } catch (publishError) {
      this.logger.error(
        `Failed to requeue message for ${queueName}; message will be nacked.`,
        publishError as Error,
      );
      this.safeNack(channel, message, `requeue failure ${queueName}`);
    }
  }

  private extractAttemptCount(message: ConsumeMessage): number {
    const headerValue = message.properties.headers?.[this.retryHeaderKey];
    const parsed =
      typeof headerValue === 'number'
        ? headerValue
        : typeof headerValue === 'string'
          ? Number(headerValue)
          : 0;

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  private async moveToDeadLetter(
    channel: ConfirmChannel,
    queueName: string,
    message: ConsumeMessage,
    attempts: number,
  ): Promise<void> {
    const deadLetterQueue = `${queueName}.${this.deadLetterQueueSuffix}`;

    try {
      await channel.assertQueue(deadLetterQueue, { durable: true });
      const deadLetterHeaders = {
        ...(message.properties.headers ?? {}),
        [this.retryHeaderKey]: attempts,
        'x-original-queue': queueName,
      };
      const published = channel.sendToQueue(deadLetterQueue, message.content, {
        ...(message.properties as AmqpChannelOptions.Publish),
        headers: deadLetterHeaders,
        persistent: true,
      });

      if (!published) {
        this.logger.error(`Dead-letter queue ${deadLetterQueue} is full; message will be nacked.`);
        this.safeNack(channel, message, `dead-letter full ${deadLetterQueue}`);
        return;
      }

      this.safeAck(channel, message, `dead-letter ${deadLetterQueue}`);
      this.logger.error(
        `Moved message from ${queueName} to ${deadLetterQueue} after ${attempts} attempts.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish to dead-letter queue ${deadLetterQueue}; message will be nacked.`,
        error as Error,
      );
      this.safeNack(channel, message, `dead-letter failure ${deadLetterQueue}`);
    }
  }

  private safeAck(channel: ConfirmChannel, message: ConsumeMessage, context: string): void {
    try {
      channel.ack(message);
    } catch (error) {
      this.logger.warn(`Failed to ack message during ${context}`, error as Error);
    }
  }

  private safeNack(channel: ConfirmChannel, message: ConsumeMessage, context: string): void {
    try {
      channel.nack(message, false, false);
    } catch (error) {
      this.logger.warn(`Failed to nack message during ${context}`, error as Error);
    }
  }
}
