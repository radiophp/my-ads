import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationBaleStatus, NotificationStatus } from '@prisma/client';
import { QueueService } from '@app/platform/queue/queue.service';
import { registerConsumerWithRetry } from '@app/platform/queue/utils/register-consumer-with-retry.util';
import { NotificationsService } from './notifications.service';
import { BaleBotService } from '../bale/bale.service';

export type BaleNotificationJob = {
  notificationId: string;
};

@Injectable()
export class BaleNotificationQueueProcessor implements OnModuleInit {
  private readonly logger = new Logger(BaleNotificationQueueProcessor.name);
  private readonly enabled: boolean;

  constructor(
    private readonly queueService: QueueService,
    private readonly notificationsService: NotificationsService,
    private readonly baleBotService: BaleBotService,
    configService: ConfigService,
  ) {
    this.enabled = !!configService.get<string>('BALE_BOT_TOKEN');
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('BALE_BOT_TOKEN is not set; bale notification consumer is disabled.');
      return;
    }
    const { maxAttempts, baseDelayMs } = this.queueService.getConsumerRetryOptions();
    await registerConsumerWithRetry<BaleNotificationJob>(
      this.queueService,
      'notification-bale',
      async (job) => this.handle(job),
      {
        logger: this.logger,
        label: 'NotificationBale',
        maxAttempts,
        baseDelayMs,
      },
    );
  }

  async enqueue(notificationId: string): Promise<void> {
    if (!notificationId) {
      return;
    }
    await this.queueService.publish('notification-bale', { notificationId });
  }

  private async handle(job: BaleNotificationJob): Promise<void> {
    if (!job.notificationId) {
      this.logger.warn('Received bale notification job without an id; ignoring.');
      return;
    }

    const notification = await this.notificationsService.getNotificationForDelivery(
      job.notificationId,
    );
    if (!notification) {
      this.logger.warn(`Bale notification ${job.notificationId} no longer exists.`);
      return;
    }

    if (notification.baleStatus !== NotificationBaleStatus.QUEUED) {
      this.logger.debug(
        `Bale notification ${notification.id} is not queued (status=${notification.baleStatus ?? 'null'}).`,
      );
      return;
    }

    const result = await this.baleBotService.sendPostToUser({
      userId: notification.userId,
      postId: notification.postId,
    });
    const baleStatus =
      result.status === 'sent'
        ? NotificationBaleStatus.SENT
        : result.status === 'not_connected'
          ? NotificationBaleStatus.HAS_NOT_CONNECTED
          : NotificationBaleStatus.FAILED;
    await this.notificationsService.recordBaleAttempt(
      notification.id,
      baleStatus,
      result.error ?? null,
    );

    if (result.status === 'sent') {
      if (notification.status !== NotificationStatus.SENT) {
        await this.notificationsService.markAsSent(notification.id);
      }
      this.logger.debug(
        `Delivered notification ${notification.id} via Bale to user ${notification.userId}.`,
      );
    }
  }
}
