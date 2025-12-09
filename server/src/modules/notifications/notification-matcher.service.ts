import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@app/platform/database/prisma.service';
import type { NotificationsConfig } from '@app/platform/config/notifications.config';
import { DivarPostsAdminService } from '@app/modules/divar-posts/divar-posts-admin.service';
import { NotificationsService } from './notifications.service';
import { NotificationQueueProcessor } from './notification-queue.processor';
import {
  normalizeSavedFilterPayload,
  serializeCategoryFilterValues,
  type SavedFilterPayload,
} from '@app/modules/saved-filters/saved-filter-payload.util';

interface ActiveSavedFilter {
  id: string;
  name: string;
  userId: string;
  payload: SavedFilterPayload;
}

@Injectable()
export class NotificationMatcherService {
  private readonly logger = new Logger(NotificationMatcherService.name);
  private readonly scanWindowMinutes: number;
  private readonly scanBatchSize: number;
  private readonly schedulerEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly divarPostsAdminService: DivarPostsAdminService,
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
    };
    this.scanWindowMinutes = config.scanWindowMinutes;
    this.scanBatchSize = config.scanBatchSize;
    this.schedulerEnabled =
      configService.get<boolean>('scheduler.enabled', { infer: true }) ?? false;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async matchNewPosts(): Promise<void> {
    if (!this.schedulerEnabled) {
      return;
    }

    const windowStart = new Date(Date.now() - this.scanWindowMinutes * 60 * 1000);
    const filters = await this.loadActiveFilters();

    while (true) {
      const candidates = await this.prisma.divarPost.findMany({
        where: {
          notificationsChecked: false,
          createdAt: { gte: windowStart },
        },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
        take: this.scanBatchSize,
      });
      if (candidates.length === 0) {
        break;
      }

      const candidateIds = candidates.map((candidate) => candidate.id);
      await this.processBatch(filters, candidateIds, windowStart);
      await this.prisma.divarPost.updateMany({
        where: { id: { in: candidateIds }, notificationsChecked: false },
        data: {
          notificationsChecked: true,
          notificationsCheckedAt: new Date(),
        },
      });
    }
  }

  private async loadActiveFilters(): Promise<ActiveSavedFilter[]> {
    const records = await this.prisma.savedFilter.findMany({
      where: {
        notificationsEnabled: true,
        user: {
          isActive: true,
        },
      },
      select: {
        id: true,
        name: true,
        userId: true,
        payload: true,
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return records.map((record) => ({
      id: record.id,
      name: record.name,
      userId: record.userId,
      payload: normalizeSavedFilterPayload(record.payload),
    }));
  }

  private async processBatch(
    filters: ActiveSavedFilter[],
    candidateIds: string[],
    windowStart: Date,
  ): Promise<void> {
    if (candidateIds.length === 0) {
      return;
    }

    for (const filter of filters) {
      const queryOptions = this.buildQueryOptions(filter, candidateIds, windowStart);
      if (!queryOptions) {
        continue;
      }

      try {
        const result = await this.divarPostsAdminService.listNormalizedPosts(queryOptions);
        for (const post of result.items) {
          const notification = await this.notificationsService.createNotificationFromMatch({
            userId: filter.userId,
            savedFilterId: filter.id,
            savedFilterName: filter.name,
            post,
          });
          if (notification) {
            await this.notificationQueue.enqueue(notification.id);
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to evaluate filter ${filter.id} for user ${filter.userId}: ${(error as Error).message}`,
          error as Error,
        );
      }
    }
  }

  private buildQueryOptions(
    filter: ActiveSavedFilter,
    candidateIds: string[],
    windowStart: Date,
  ): Parameters<DivarPostsAdminService['listNormalizedPosts']>[0] {
    const payload = filter.payload;
    const cityIds =
      payload.citySelection.mode === 'custom' ? payload.citySelection.cityIds : undefined;
    const districtIds =
      payload.districtSelection.mode === 'custom'
        ? payload.districtSelection.districtIds
        : undefined;
    const categorySlug = payload.categorySelection.slug ?? undefined;
    const categoryDepth =
      typeof payload.categorySelection.depth === 'number'
        ? payload.categorySelection.depth
        : undefined;
    const categoryFilters = categorySlug
      ? serializeCategoryFilterValues(payload.categoryFilters[categorySlug])
      : undefined;

    return {
      limit: candidateIds.length,
      provinceId: payload.provinceId ?? undefined,
      cityIds: cityIds && cityIds.length > 0 ? cityIds : undefined,
      districtIds: districtIds && districtIds.length > 0 ? districtIds : undefined,
      categorySlug,
      categoryDepth,
      filters: categoryFilters,
      ringFolderId: payload.ringBinderFolderId ?? undefined,
      noteFilter: payload.noteFilter !== 'all' ? payload.noteFilter : undefined,
      userId: filter.userId,
      postIds: candidateIds,
      createdAfter: windowStart,
    };
  }
}
