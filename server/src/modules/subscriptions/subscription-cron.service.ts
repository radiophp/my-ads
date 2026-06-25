import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/platform/database/prisma.service';
import { BaleBotService } from '@app/modules/bale/bale.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);
  private readonly schedulerEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly baleBotService: BaleBotService,
    configService: ConfigService,
  ) {
    this.schedulerEnabled =
      configService.get<boolean>('scheduler.enabled', { infer: true }) ?? false;
  }

  @Cron('0 2 * * *', { name: 'subscription-checker-2am' })
  async checkAt2AM(): Promise<void> {
    if (!this.schedulerEnabled) return;
    await this.runCheck();
  }

  @Cron('0 4 * * *', { name: 'subscription-checker-4am' })
  async checkAt4AM(): Promise<void> {
    if (!this.schedulerEnabled) return;
    await this.runCheck();
  }

  private async runCheck(): Promise<void> {
    try {
      const now = new Date();

      const expiredSubs = await this.prisma.userSubscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endsAt: { lt: now },
        },
        include: {
          package: { select: { title: true } },
        },
      });

      if (expiredSubs.length === 0) {
        this.logger.log('No expired subscriptions found.');
        return;
      }

      const userIds = [...new Set(expiredSubs.map((s) => s.userId))];
      const subIds = expiredSubs.map((s) => s.id);

      await this.prisma.$transaction([
        this.prisma.userSubscription.updateMany({
          where: { id: { in: subIds } },
          data: { status: SubscriptionStatus.EXPIRED },
        }),
        this.prisma.savedFilter.updateMany({
          where: { userId: { in: userIds }, isActive: true },
          data: { isActive: false, notificationsEnabled: false },
        }),
      ]);

      this.logger.log(
        `Expired ${subIds.length} subscription(s) and deactivated saved filters for ${userIds.length} user(s).`,
      );

      for (const sub of expiredSubs) {
        try {
          const result = await this.baleBotService.sendSubscriptionExpired(
            sub.userId,
            sub.package.title,
          );
          if (result.success) {
            this.logger.log(
              `Bale notification sent to user ${sub.userId} for expired subscription.`,
            );
          } else {
            this.logger.warn(`Bale notification skipped for user ${sub.userId}: ${result.error}`);
          }
        } catch (err) {
          this.logger.warn(
            `Bale notification failed for user ${sub.userId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `Subscription checker cron failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
