import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationBaleStatus, NotificationStatus } from '@prisma/client';
import { QueueService } from '@app/platform/queue/queue.service';
import { registerConsumerWithRetry } from '@app/platform/queue/utils/register-consumer-with-retry.util';
import { RedisService } from '@app/platform/cache/redis.service';
import { SubscriptionsService } from '@app/modules/subscriptions/subscriptions.service';
import { PrismaService } from '@app/platform/database/prisma.service';
import { NotificationsService } from './notifications.service';
import { BaleBotService } from '../bale/bale.service';

export type BaleNotificationJob = {
  notificationId: string;
};

function msUntilMidnight(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
}

@Injectable()
export class BaleNotificationQueueProcessor implements OnModuleInit {
  private readonly logger = new Logger(BaleNotificationQueueProcessor.name);
  private readonly enabled: boolean;

  constructor(
    private readonly queueService: QueueService,
    private readonly notificationsService: NotificationsService,
    private readonly baleBotService: BaleBotService,
    private readonly redisService: RedisService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly prisma: PrismaService,
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

  private async getUserRole(userId: string): Promise<string> {
    const cacheKey = `user-role:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const role = user?.role ?? 'USER';
    await this.redisService.pSetEx(cacheKey, 6 * 3600_000, role);
    return role;
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

    // --- daily notification limit check ---
    const role = await this.getUserRole(notification.userId);
    const isAdmin = role === 'ADMIN';

    if (!isAdmin) {
      const limit = await this.subscriptionsService.resolveFeatureLimit(
        notification.userId,
        'notifications_limit',
      );

      if (limit <= 0) {
        this.logger.debug(
          `Notification ${notification.id}: notifications_limit is ${limit}, marking LIMIT_REACHED.`,
        );
        await this.notificationsService.recordBaleAttempt(
          notification.id,
          NotificationBaleStatus.LIMIT_REACHED,
          'notifications_limit is 0',
        );
        return;
      }

      const countKey = `bale-notif-count:${notification.userId}`;
      const warnedKey = `bale-notif-warned:${notification.userId}`;
      const count = await this.redisService.incr(countKey);

      if (count === 1) {
        await this.redisService.pSetEx(countKey, msUntilMidnight(), '1');
      }

      if (count > limit) {
        const alreadyWarned = await this.redisService.get(warnedKey);
        if (!alreadyWarned) {
          this.baleBotService
            .sendNotificationLimitWarning(notification.userId)
            .catch((err) =>
              this.logger.error(
                `Failed to send limit warning to user ${notification.userId}: ${(err as Error).message}`,
              ),
            );
          await this.redisService.pSetEx(warnedKey, msUntilMidnight(), '1');
        }

        await this.notificationsService.recordBaleAttempt(
          notification.id,
          NotificationBaleStatus.LIMIT_REACHED,
          'daily notification limit reached',
        );
        return;
      }
    }
    // --- end limit check ---

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
