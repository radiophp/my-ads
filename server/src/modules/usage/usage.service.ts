import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { SubscriptionsService } from '@app/modules/subscriptions/subscriptions.service';

const DAILY_FEATURES = new Set(['zip_downloads_per_day', 'divar_drafts_per_day', 'ai_edits_limit']);

@Injectable()
export class UsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async logUsage(
    userId: string,
    feature: string,
    action: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.usageLog.create({
      data: {
        userId,
        feature,
        action,
        metadata: (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }

  async checkLimit(
    userId: string,
    feature: string,
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const subscription = await this.subscriptionsService.getActiveSubscription(userId);
    const features = subscription?.package?.features;
    const limit = features ? Number(features[feature] ?? 0) : 0;

    if (limit <= 0) {
      return { allowed: false, current: 0, limit: 0 };
    }

    let current: number;

    if (DAILY_FEATURES.has(feature)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      current = await this.prisma.usageLog.count({
        where: { userId, feature, consumedAt: { gte: today } },
      });
    } else {
      current = await this.prisma.usageLog.count({
        where: { userId, feature },
      });
    }

    return { allowed: current < limit, current, limit };
  }

  async getDailyUsage(userId: string, feature: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.usageLog.count({
      where: { userId, feature, consumedAt: { gte: today } },
    });
  }

  async getUsageReport(params: {
    userId?: string;
    feature?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const { userId, feature, from, to, page = 1, limit = 50 } = params;
    const where: Prisma.UsageLogWhereInput = {};

    if (userId) where.userId = userId;
    if (feature) where.feature = feature;
    if (from || to) {
      where.consumedAt = {};
      if (from) where.consumedAt.gte = from;
      if (to) where.consumedAt.lte = to;
    }

    const [total, items] = await Promise.all([
      this.prisma.usageLog.count({ where }),
      this.prisma.usageLog.findMany({
        where,
        orderBy: { consumedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, phone: true, firstName: true, lastName: true } } },
      }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUsageSummary(userId: string) {
    const subscription = await this.subscriptionsService.getActiveSubscription(userId);
    const features = subscription?.package?.features;

    if (!features) return { features: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entries = await Promise.all(
      Object.entries(features).map(async ([key, val]) => {
        const limit = Number(val);
        if (limit <= 0) return null;

        let current: number;
        if (DAILY_FEATURES.has(key)) {
          current = await this.prisma.usageLog.count({
            where: { userId, feature: key, consumedAt: { gte: today } },
          });
        } else {
          current = await this.prisma.usageLog.count({
            where: { userId, feature: key },
          });
        }

        return { feature: key, limit, current, remaining: Math.max(0, limit - current) };
      }),
    );

    return { features: entries.filter(Boolean) };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldLogs() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    await this.prisma.usageLog.deleteMany({
      where: { consumedAt: { lt: cutoff } },
    });
  }
}
