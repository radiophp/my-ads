import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationStatus } from '@prisma/client';
import { QueueService } from '@app/platform/queue/queue.service';
import { registerConsumerWithRetry } from '@app/platform/queue/utils/register-consumer-with-retry.util';
import { WebsocketGateway } from '@app/platform/websocket/websocket.gateway';
import type { NotificationsConfig } from '@app/platform/config/notifications.config';
import { NotificationsService } from './notifications.service';

export type NotificationJob = {
  notificationId: string;
};

@Injectable()
export class NotificationQueueProcessor implements OnModuleInit {
  private readonly logger = new Logger(NotificationQueueProcessor.name);
  private readonly retryIntervalMs: number;
  private readonly maxDeliveryAttempts: number;

  constructor(
    private readonly queueService: QueueService,
    private readonly notificationsService: NotificationsService,
    private readonly websocketGateway: WebsocketGateway,
    configService: ConfigService,
  ) {
    const config = configService.get<NotificationsConfig>('notifications', { infer: true }) ?? {
      scanWindowMinutes: 10,
      scanBatchSize: 50,
      retryIntervalMs: 180000,
      maxDeliveryAttempts: 3,
      retentionDays: 3,
    };
    this.retryIntervalMs = config.retryIntervalMs;
    this.maxDeliveryAttempts = config.maxDeliveryAttempts;
  }

  async onModuleInit(): Promise<void> {
    const { maxAttempts, baseDelayMs } = this.queueService.getConsumerRetryOptions();
    await registerConsumerWithRetry<NotificationJob>(
      this.queueService,
      'notification',
      async (job) => this.handle(job),
      {
        logger: this.logger,
        label: 'Notification',
        maxAttempts,
        baseDelayMs,
      },
    );
  }

  async enqueue(notificationId: string): Promise<void> {
    if (!notificationId) {
      return;
    }
    await this.queueService.publish('notification', { notificationId });
  }

  private async handle(job: NotificationJob): Promise<void> {
    if (!job.notificationId) {
      this.logger.warn('Received notification job without an id; ignoring.');
      return;
    }

    const notification = await this.notificationsService.getNotificationForDelivery(
      job.notificationId,
    );
    if (!notification) {
      this.logger.warn(`Notification ${job.notificationId} no longer exists.`);
      return;
    }

    if (notification.status === NotificationStatus.SENT) {
      this.logger.debug(`Notification ${notification.id} already delivered.`);
      return;
    }
    if (notification.status === NotificationStatus.FAILED) {
      this.logger.debug(`Notification ${notification.id} already marked as failed.`);
      return;
    }

    const payload = this.notificationsService.buildRealtimePayload(notification);
    const delivered = this.websocketGateway.emitToUser(
      notification.userId,
      'notifications:new',
      payload,
    );

    if (delivered) {
      await this.notificationsService.markAsSent(notification.id);
      this.logger.debug(
        `Dispatched notification ${notification.id} to user ${notification.userId}.`,
      );
      return;
    }

    if (notification.attemptCount + 1 >= this.maxDeliveryAttempts) {
      await this.notificationsService.markAsFailed(
        notification.id,
        'User is not connected to the websocket gateway.',
      );
      this.logger.warn(
        `Notification ${notification.id} exhausted delivery attempts (${this.maxDeliveryAttempts}).`,
      );
      return;
    }

    await this.notificationsService.scheduleRetry(
      notification,
      'User is not connected to the websocket gateway.',
      this.retryIntervalMs,
      this.maxDeliveryAttempts,
    );
    this.logger.debug(
      `Scheduled retry #${notification.attemptCount + 1} for notification ${notification.id}.`,
    );
  }
}
