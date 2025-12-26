import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import type { NotificationsConfig } from '@app/platform/config/notifications.config';
import { NotificationsService } from './notifications.service';
import { NotificationQueueProcessor } from './notification-queue.processor';

@Injectable()
export class NotificationMaintenanceService {
  private readonly logger = new Logger(NotificationMaintenanceService.name);
  private readonly schedulerEnabled: boolean;
  private readonly retryBatchSize: number;
  private readonly retentionDays: number;
  private readonly queueReservationMs: number;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationQueue: NotificationQueueProcessor,
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
    this.retryBatchSize = config.scanBatchSize;
    this.retentionDays = config.retentionDays;
    this.schedulerEnabled =
      configService.get<boolean>('scheduler.enabled', { infer: true }) ?? false;
    this.queueReservationMs = Math.max(5000, Math.min(config.retryIntervalMs / 2, 60000));
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async enqueueDueNotifications(): Promise<void> {
    if (!this.schedulerEnabled) {
      return;
    }
    const now = new Date();
    const due = await this.notificationsService.findDueNotifications(this.retryBatchSize, now);
    for (const notification of due) {
      const reserved = await this.notificationsService.reservePendingNotification(
        notification.id,
        now,
        this.queueReservationMs,
      );
      if (reserved) {
        await this.notificationQueue.enqueue(notification.id);
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredNotifications(): Promise<void> {
    if (!this.schedulerEnabled) {
      return;
    }
    const threshold = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    const removed = await this.notificationsService.cleanupOldNotifications(threshold);
    if (removed > 0) {
      this.logger.log(`Removed ${removed} notifications older than ${this.retentionDays} days.`);
    }
  }
}
