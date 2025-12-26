import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationTelegramStatus, NotificationStatus } from '@prisma/client';
import { QueueService } from '@app/platform/queue/queue.service';
import { registerConsumerWithRetry } from '@app/platform/queue/utils/register-consumer-with-retry.util';
import { NotificationsService } from './notifications.service';
import { TelegramBotService } from '../telegram/telegram.service';

export type TelegramNotificationJob = {
  notificationId: string;
};

@Injectable()
export class TelegramNotificationQueueProcessor implements OnModuleInit {
  private readonly logger = new Logger(TelegramNotificationQueueProcessor.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly notificationsService: NotificationsService,
    private readonly telegramBotService: TelegramBotService,
  ) {}

  async onModuleInit(): Promise<void> {
    const { maxAttempts, baseDelayMs } = this.queueService.getConsumerRetryOptions();
    await registerConsumerWithRetry<TelegramNotificationJob>(
      this.queueService,
      'notification-telegram',
      async (job) => this.handle(job),
      {
        logger: this.logger,
        label: 'NotificationTelegram',
        maxAttempts,
        baseDelayMs,
      },
    );
  }

  async enqueue(notificationId: string): Promise<void> {
    if (!notificationId) {
      return;
    }
    await this.queueService.publish('notification-telegram', { notificationId });
  }

  private async handle(job: TelegramNotificationJob): Promise<void> {
    if (!job.notificationId) {
      this.logger.warn('Received telegram notification job without an id; ignoring.');
      return;
    }

    const notification = await this.notificationsService.getNotificationForDelivery(
      job.notificationId,
    );
    if (!notification) {
      this.logger.warn(`Telegram notification ${job.notificationId} no longer exists.`);
      return;
    }

    if (notification.telegramStatus !== NotificationTelegramStatus.QUEUED) {
      this.logger.debug(
        `Telegram notification ${notification.id} is not queued (status=${notification.telegramStatus ?? 'null'}).`,
      );
      return;
    }

    const result = await this.telegramBotService.sendPostToUser({
      userId: notification.userId,
      postId: notification.postId,
    });
    const telegramStatus =
      result.status === 'sent'
        ? NotificationTelegramStatus.SENT
        : result.status === 'not_connected'
          ? NotificationTelegramStatus.HAS_NOT_CONNECTED
          : NotificationTelegramStatus.FAILED;
    await this.notificationsService.recordTelegramAttempt(
      notification.id,
      telegramStatus,
      result.error ?? null,
    );

    if (result.status === 'sent') {
      if (notification.status !== NotificationStatus.SENT) {
        await this.notificationsService.markAsSent(notification.id);
      }
      this.logger.debug(
        `Delivered notification ${notification.id} via Telegram to user ${notification.userId}.`,
      );
    }
  }
}
