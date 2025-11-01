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

export type QueueName = 'email' | 'notification';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly queuePrefix: string;
  private readonly assertedQueues = new Set<string>();
  private readonly connection: AmqpConnectionManager;
  private readonly channel: ChannelWrapper;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<RabbitMQConfig>('rabbitmq', { infer: true });
    if (!config) {
      throw new Error('RabbitMQ configuration is missing.');
    }

    this.queuePrefix = config.queuePrefix;

    const connectionOptions: AmqpConnectionManagerOptions = {
      heartbeatIntervalInSeconds: config.heartbeat,
      reconnectTimeInSeconds: config.reconnect,
    };

    this.connection = connect([config.url], connectionOptions);
    this.connection.on('connect', () => this.logger.log('Connected to RabbitMQ'));
    this.connection.on('disconnect', (error) => {
      const reason = error?.err ? (error.err as Error).message : 'unknown reason';
      this.logger.error(`Disconnected from RabbitMQ: ${reason}`);
    });

    this.channel = this.connection.createChannel({
      setup: async (channel: ConfirmChannel) => {
        await channel.prefetch(config.prefetch);
      },
    });
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
            channel.nack(message, false, false);
          }
        },
        { noAck: false },
      );
    });
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
}
