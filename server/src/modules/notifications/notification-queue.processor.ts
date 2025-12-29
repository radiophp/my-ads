import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationStatus,
  NotificationTelegramStatus,
  NotificationChannelStatus,
} from '@prisma/client';
import { QueueService } from '@app/platform/queue/queue.service';
import { registerConsumerWithRetry } from '@app/platform/queue/utils/register-consumer-with-retry.util';
import { WebsocketGateway } from '@app/platform/websocket/websocket.gateway';
import type { NotificationsConfig } from '@app/platform/config/notifications.config';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { TelegramNotificationQueueProcessor } from './telegram-notification-queue.processor';

export type NotificationJob = {
  notificationId: string;
};

@Injectable()
export class NotificationQueueProcessor implements OnModuleInit {
  private readonly logger = new Logger(NotificationQueueProcessor.name);
  private readonly retryIntervalMs: number;
  private readonly maxDeliveryAttempts: number;
  private readonly alwaysSendPush: boolean;
  private readonly queueConsumerEnabled: boolean;

  constructor(
    private readonly queueService: QueueService,
    private readonly notificationsService: NotificationsService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly pushNotifications: PushNotificationService,
    private readonly telegramQueue: TelegramNotificationQueueProcessor,
    configService: ConfigService,
  ) {
    const config = configService.get<NotificationsConfig>('notifications', { infer: true }) ?? {
      scanWindowMinutes: 10,
      scanBatchSize: 50,
      retryIntervalMs: 180000,
      maxDeliveryAttempts: 3,
      retentionDays: 3,
      alwaysSendPush: true,
    };
    this.retryIntervalMs = config.retryIntervalMs;
    this.maxDeliveryAttempts = config.maxDeliveryAttempts;
    this.alwaysSendPush = config.alwaysSendPush ?? true;
    this.queueConsumerEnabled = config.queueConsumerEnabled ?? true;
  }

  async onModuleInit(): Promise<void> {
    if (!this.queueConsumerEnabled) {
      this.logger.warn('Notification queue consumer is disabled; skipping registration.');
      return;
    }
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

    if (
      notification.telegramStatus === NotificationTelegramStatus.SENT ||
      notification.websocketStatus === NotificationChannelStatus.SENT ||
      notification.pushStatus === NotificationChannelStatus.SENT
    ) {
      await this.notificationsService.markAsSent(notification.id);
      this.logger.debug(`Notification ${notification.id} already delivered via another channel.`);
      return;
    }

    const payload = this.notificationsService.buildRealtimePayload(notification);
    const websocketDelivered = this.websocketGateway.emitToUser(
      notification.userId,
      'notifications:new',
      payload,
    );
    await this.notificationsService.recordWebsocketAttempt(
      notification.id,
      websocketDelivered ? NotificationChannelStatus.SENT : NotificationChannelStatus.FAILED,
      websocketDelivered ? null : 'not_connected',
    );

    let delivered = websocketDelivered;

    const shouldAttemptPush = this.alwaysSendPush || !websocketDelivered;
    if (!shouldAttemptPush) {
      await this.notificationsService.recordPushAttempt(
        notification.id,
        NotificationChannelStatus.SKIPPED,
        'websocket_delivered',
        false,
      );
    } else {
      const pushResult = await this.pushNotifications.sendToUser(notification.userId, payload);
      const pushStatus = pushResult.delivered
        ? NotificationChannelStatus.SENT
        : pushResult.attempted
          ? NotificationChannelStatus.FAILED
          : NotificationChannelStatus.SKIPPED;
      await this.notificationsService.recordPushAttempt(
        notification.id,
        pushStatus,
        pushResult.error ?? pushResult.reason ?? null,
        pushResult.attempted,
      );
      if (pushResult.delivered) {
        delivered = true;
        this.logger.debug(
          `Delivered notification ${notification.id} via push to user ${notification.userId}.`,
        );
      }
    }

    if (notification.telegramStatus === NotificationTelegramStatus.PENDING) {
      const queued = await this.notificationsService.markTelegramQueued(notification.id);
      if (queued) {
        await this.telegramQueue.enqueue(notification.id);
      }
    }

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
      'Delivery pending: websocket offline and push not delivered.',
      this.retryIntervalMs,
      this.maxDeliveryAttempts,
      0.2,
    );
    this.logger.debug(
      `Scheduled retry #${notification.attemptCount + 1} for notification ${notification.id}.`,
    );
  }
}
