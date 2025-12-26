import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { RabbitMQConfig } from '@app/platform/config/rabbitmq.config';
import { PrismaService } from '@app/platform/database/prisma.service';
import { MetricsService } from '@app/platform/metrics/metrics.service';

type QueueStats = {
  messages: number;
  messagesReady: number;
  messagesUnacknowledged: number;
  consumers: number;
};

@Injectable()
export class NotificationQueueMonitorService {
  private readonly logger = new Logger(NotificationQueueMonitorService.name);
  private readonly schedulerEnabled: boolean;
  private readonly managementUrl: string | null;
  private readonly managementAuthHeader: string | null;
  private readonly managementTimeoutMs: number;
  private readonly queueNames: string[];
  private readonly retryAlertWindowMinutes: number;
  private readonly retryAlertThreshold: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
    configService: ConfigService,
  ) {
    const rabbitmq = configService.get<RabbitMQConfig>('rabbitmq', { infer: true });
    const schedulerEnabled =
      configService.get<boolean>('scheduler.enabled', { infer: true }) ?? false;
    this.schedulerEnabled = schedulerEnabled;

    this.managementUrl = rabbitmq?.managementUrl ?? null;
    this.managementTimeoutMs = rabbitmq?.managementTimeoutMs ?? 3000;

    const user = rabbitmq?.managementUser ?? '';
    const pass = rabbitmq?.managementPassword ?? '';
    this.managementAuthHeader =
      user && pass ? `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` : null;

    const prefix = rabbitmq?.queuePrefix ?? 'my-ads';
    this.queueNames = [`${prefix}.notification`, `${prefix}.notification-telegram`];

    this.retryAlertWindowMinutes = this.toNumber(
      process.env['NOTIFICATION_RETRY_ALERT_WINDOW_MINUTES'],
      5,
    );
    this.retryAlertThreshold = this.toNumber(process.env['NOTIFICATION_RETRY_ALERT_THRESHOLD'], 20);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async monitorQueues(): Promise<void> {
    if (!this.schedulerEnabled) {
      return;
    }

    if (!this.managementUrl) {
      this.logger.debug('RabbitMQ management URL not configured; skipping queue stats.');
      return;
    }

    for (const queueName of this.queueNames) {
      const stats = await this.fetchQueueStats(queueName);
      if (!stats) {
        continue;
      }
      this.metricsService.recordQueueMetrics({
        queue: queueName,
        messages: stats.messages,
        messagesReady: stats.messagesReady,
        messagesUnacknowledged: stats.messagesUnacknowledged,
        consumers: stats.consumers,
      });

      if (stats.messagesUnacknowledged > 0) {
        this.logger.warn(
          `Queue ${queueName} has ${stats.messagesUnacknowledged} unacked messages.`,
        );
      }
      if (stats.consumers < 1) {
        this.logger.warn(`Queue ${queueName} has no active consumers.`);
      }
    }

    await this.checkRetryRate();
  }

  private async checkRetryRate(): Promise<void> {
    if (this.retryAlertThreshold <= 0) {
      return;
    }
    const windowStart = new Date(Date.now() - this.retryAlertWindowMinutes * 60 * 1000);
    const retryCount = await this.prisma.notification.count({
      where: {
        attemptCount: { gt: 0 },
        updatedAt: { gte: windowStart },
      },
    });
    if (retryCount >= this.retryAlertThreshold) {
      this.logger.warn(
        `High notification retry volume: ${retryCount} retries in the last ${this.retryAlertWindowMinutes} minutes.`,
      );
    }
  }

  private async fetchQueueStats(queueName: string): Promise<QueueStats | null> {
    try {
      const url = `${this.managementUrl}/api/queues/%2F/${encodeURIComponent(queueName)}`;
      const response = await this.withTimeout(
        fetch(url, {
          headers: this.managementAuthHeader
            ? { Authorization: this.managementAuthHeader }
            : undefined,
        }),
        this.managementTimeoutMs,
      );

      if (!response.ok) {
        this.logger.warn(`Queue stats request failed for ${queueName}: ${response.status}`);
        return null;
      }
      const data = (await response.json()) as {
        messages?: number;
        messages_ready?: number;
        messages_unacknowledged?: number;
        consumers?: number;
      };

      return {
        messages: data.messages ?? 0,
        messagesReady: data.messages_ready ?? 0,
        messagesUnacknowledged: data.messages_unacknowledged ?? 0,
        consumers: data.consumers ?? 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to fetch queue stats for ${queueName}: ${message}`);
      return null;
    }
  }

  private async withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error('queue_monitor_timeout'));
      }, timeoutMs);
    });

    try {
      return await Promise.race([task, timeoutPromise]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private toNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
