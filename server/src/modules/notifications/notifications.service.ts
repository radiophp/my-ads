import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, NotificationStatus, type Notification } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import type { DivarPostListItemDto } from '@app/modules/divar-posts/dto/divar-post.dto';
import { NotificationDto, PaginatedNotificationsDto } from './dto/notification.dto';
import type { StoredNotificationPayload, RealtimeNotificationPayload } from './notification.types';

const NOTIFICATION_PAGE_LIMIT = 50;

type NotificationWithRelations = Notification & {
  post: {
    id: string;
    title: string | null;
    description: string | null;
    priceTotal: Prisma.Decimal | number | null;
    rentAmount: Prisma.Decimal | number | null;
    depositAmount: Prisma.Decimal | number | null;
    cityName: string | null;
    districtName: string | null;
    provinceName: string | null;
    permalink: string | null;
    publishedAt: Date | null;
    medias: {
      url: string | null;
      thumbnailUrl: string | null;
      localUrl: string | null;
      localThumbnailUrl: string | null;
    }[];
  };
  savedFilter: {
    id: string;
    name: string | null;
  };
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createTestNotification(params: {
    userId: string;
    savedFilterId: string;
    postId: string;
    message?: string | null;
  }): Promise<Notification> {
    const savedFilter = await this.prisma.savedFilter.findUnique({
      where: { id: params.savedFilterId },
      select: { id: true, name: true, userId: true },
    });
    if (!savedFilter) {
      throw new NotFoundException('Saved filter not found');
    }
    if (savedFilter.userId !== params.userId) {
      throw new BadRequestException('Saved filter does not belong to the specified user');
    }

    const post = await this.prisma.divarPost.findUnique({
      where: { id: params.postId },
      select: {
        id: true,
        title: true,
        description: true,
        priceTotal: true,
        rentAmount: true,
        depositAmount: true,
        cityName: true,
        districtName: true,
        provinceName: true,
        permalink: true,
        publishedAt: true,
        medias: {
          orderBy: { position: 'asc' },
          take: 1,
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            localUrl: true,
            localThumbnailUrl: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const payload = this.buildPayloadSnapshot(
      {
        id: post.id,
        externalId: '',
        title: post.title ?? null,
        description: post.description ?? null,
        priceTotal: this.castDecimal(post.priceTotal),
        rentAmount: this.castDecimal(post.rentAmount),
        depositAmount: this.castDecimal(post.depositAmount),
        dailyRateNormal: null,
        dailyRateWeekend: null,
        dailyRateHoliday: null,
        extraPersonFee: null,
        pricePerSquare: null,
        area: null,
        areaLabel: null,
        landArea: null,
        landAreaLabel: null,
        rooms: null,
        roomsLabel: null,
        floor: null,
        floorLabel: null,
        floorsCount: null,
        unitPerFloor: null,
        yearBuilt: null,
        yearBuiltLabel: null,
        capacity: null,
        capacityLabel: null,
        hasParking: null,
        hasElevator: null,
        hasWarehouse: null,
        hasBalcony: null,
        isRebuilt: null,
        photosVerified: null,
        cityName: post.cityName ?? null,
        districtName: post.districtName ?? null,
        provinceName: post.provinceName ?? null,
        categorySlug: '',
        businessType: null,
        publishedAt: post.publishedAt ?? null,
        publishedAtJalali: null,
        createdAt: post.publishedAt ?? new Date(),
        permalink: post.permalink ?? null,
        imageUrl: null,
        mediaCount: post.medias.length,
        medias: post.medias.map((media) => ({
          id: media.id,
          url: media.url ?? '',
          thumbnailUrl: media.thumbnailUrl ?? null,
          alt: null,
        })),
      } as DivarPostListItemDto,
      { id: savedFilter.id, name: savedFilter.name ?? '' },
    );

    try {
      return await this.prisma.notification.create({
        data: {
          userId: params.userId,
          savedFilterId: savedFilter.id,
          postId: post.id,
          message: params.message ?? post.title ?? post.description ?? null,
          payload: payload as Prisma.InputJsonValue,
          nextAttemptAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('A notification for this post and filter already exists');
      }
      throw error;
    }
  }

  async listUserNotifications(
    userId: string,
    options: { cursor?: string; limit?: number } = {},
  ): Promise<PaginatedNotificationsDto> {
    const take = Math.min(Math.max(options.limit ?? 20, 1), NOTIFICATION_PAGE_LIMIT);
    const queryArgs: Prisma.NotificationFindManyArgs = {
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    };

    const records = await this.prisma.notification.findMany(queryArgs);
    const hasMore = records.length > take;
    const items = hasMore ? records.slice(0, take) : records;

    return {
      items: items.map((record) => this.mapRecordToDto(record)),
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
      hasMore,
    };
  }

  async createNotificationFromMatch(params: {
    userId: string;
    savedFilterId: string;
    savedFilterName: string;
    post: DivarPostListItemDto;
  }): Promise<Notification | null> {
    const snapshot = this.buildPayloadSnapshot(params.post, {
      id: params.savedFilterId,
      name: params.savedFilterName,
    });

    try {
      return await this.prisma.notification.create({
        data: {
          userId: params.userId,
          savedFilterId: params.savedFilterId,
          postId: params.post.id,
          message: params.post.title ?? params.post.description ?? null,
          payload: snapshot as Prisma.InputJsonValue,
          nextAttemptAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.debug(
          `Notification already exists for user ${params.userId} -> filter ${params.savedFilterId} -> post ${params.post.id}`,
        );
        return null;
      }
      throw error;
    }
  }

  async getNotificationForDelivery(id: string): Promise<NotificationWithRelations | null> {
    return this.prisma.notification.findUnique({
      where: { id },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            description: true,
            priceTotal: true,
            rentAmount: true,
            depositAmount: true,
            cityName: true,
            districtName: true,
            provinceName: true,
            permalink: true,
            publishedAt: true,
            medias: {
              orderBy: { position: 'asc' },
              take: 1,
              select: {
                url: true,
                thumbnailUrl: true,
                localUrl: true,
                localThumbnailUrl: true,
              },
            },
          },
        },
        savedFilter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async markAsSent(notificationId: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        message: 'delivered',
      },
    });
  }

  async markAsFailed(notificationId: string, errorMessage: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.FAILED,
        failedAt: new Date(),
        message: errorMessage,
      },
    });
  }

  async scheduleRetry(
    notification: Notification,
    reason: string,
    retryIntervalMs: number,
    maxAttempts: number,
  ): Promise<void> {
    const nextAttempt = notification.attemptCount + 1;
    const hasAttemptsLeft = nextAttempt < maxAttempts;

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        attemptCount: nextAttempt,
        nextAttemptAt: hasAttemptsLeft ? new Date(Date.now() + retryIntervalMs) : new Date(),
        status: hasAttemptsLeft ? NotificationStatus.PENDING : NotificationStatus.FAILED,
        ...(hasAttemptsLeft ? {} : { failedAt: new Date() }),
        message: reason,
      },
    });
  }

  async findDueNotifications(limit: number, now: Date): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.PENDING,
        nextAttemptAt: { lte: now },
      },
      orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  async reservePendingNotification(
    notificationId: string,
    now: Date,
    holdMs: number,
  ): Promise<boolean> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        status: NotificationStatus.PENDING,
        nextAttemptAt: { lte: now },
      },
      data: {
        nextAttemptAt: new Date(Date.now() + holdMs),
      },
    });
    return result.count > 0;
  }

  async cleanupOldNotifications(threshold: Date): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: threshold },
        status: { in: [NotificationStatus.SENT, NotificationStatus.FAILED] },
      },
    });
    return result.count;
  }

  buildRealtimePayload(
    record:
      | NotificationWithRelations
      | (Notification & {
          post?: NotificationWithRelations['post'];
          savedFilter?: NotificationWithRelations['savedFilter'];
        }),
  ): RealtimeNotificationPayload {
    const snapshot = this.parsePayload(record.payload);
    const fallbackFilter = record.savedFilter
      ? { id: record.savedFilter.id, name: record.savedFilter.name ?? '' }
      : { id: record.savedFilterId, name: '' };
    const fallbackPost = record.post
      ? {
          id: record.post.id,
          title: record.post.title ?? null,
          description: record.post.description ?? null,
          priceTotal: this.castDecimal(record.post.priceTotal),
          rentAmount: this.castDecimal(record.post.rentAmount),
          depositAmount: this.castDecimal(record.post.depositAmount),
          cityName: record.post.cityName ?? null,
          districtName: record.post.districtName ?? null,
          provinceName: record.post.provinceName ?? null,
          permalink: record.post.permalink ?? null,
          publishedAt: record.post.publishedAt ? record.post.publishedAt.toISOString() : null,
          previewImageUrl: this.resolveMediaFromRelation(record.post.medias?.[0]),
        }
      : {
          id: record.postId,
          title: null,
          description: null,
          priceTotal: null,
          rentAmount: null,
          depositAmount: null,
          cityName: null,
          districtName: null,
          provinceName: null,
          permalink: null,
          publishedAt: null,
          previewImageUrl: null,
        };

    const payload = snapshot ?? { filter: fallbackFilter, post: fallbackPost };

    return {
      id: record.id,
      status: record.status,
      message: record.message ?? null,
      createdAt: record.createdAt.toISOString(),
      sentAt: record.sentAt ? record.sentAt.toISOString() : null,
      filter: payload.filter,
      post: payload.post,
    };
  }

  private buildPayloadSnapshot(
    post: DivarPostListItemDto,
    filter: { id: string; name: string },
  ): StoredNotificationPayload {
    return {
      filter,
      post: {
        id: post.id,
        title: post.title ?? null,
        description: post.description ?? null,
        priceTotal: post.priceTotal ?? null,
        rentAmount: post.rentAmount ?? null,
        depositAmount: post.depositAmount ?? null,
        cityName: post.cityName ?? null,
        districtName: post.districtName ?? null,
        provinceName: post.provinceName ?? null,
        permalink: post.permalink ?? null,
        publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
        previewImageUrl: this.resolvePreviewImage(post),
      },
    };
  }

  private resolvePreviewImage(post: DivarPostListItemDto): string | null {
    const media = post.medias?.[0];
    if (!media) {
      return null;
    }
    const enriched = media as typeof media & {
      localUrl?: string | null;
      localThumbnailUrl?: string | null;
    };
    return (
      enriched.localThumbnailUrl ??
      enriched.thumbnailUrl ??
      enriched.localUrl ??
      enriched.url ??
      null
    );
  }

  private parsePayload(payload: Prisma.JsonValue | null): StoredNotificationPayload | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }
    const data = payload as Prisma.JsonObject;
    const filter = data['filter'];
    const post = data['post'];
    if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
      return null;
    }
    if (!post || typeof post !== 'object' || Array.isArray(post)) {
      return null;
    }
    return {
      filter: {
        id:
          typeof (filter as Prisma.JsonObject)['id'] === 'string'
            ? ((filter as Prisma.JsonObject)['id'] as string)
            : '',
        name:
          typeof (filter as Prisma.JsonObject)['name'] === 'string'
            ? ((filter as Prisma.JsonObject)['name'] as string)
            : '',
      },
      post: {
        id:
          typeof (post as Prisma.JsonObject)['id'] === 'string'
            ? ((post as Prisma.JsonObject)['id'] as string)
            : '',
        title: this.parseNullableString(post, 'title'),
        description: this.parseNullableString(post, 'description'),
        priceTotal: this.parseNullableNumber(post, 'priceTotal'),
        rentAmount: this.parseNullableNumber(post, 'rentAmount'),
        depositAmount: this.parseNullableNumber(post, 'depositAmount'),
        cityName: this.parseNullableString(post, 'cityName'),
        districtName: this.parseNullableString(post, 'districtName'),
        provinceName: this.parseNullableString(post, 'provinceName'),
        permalink: this.parseNullableString(post, 'permalink'),
        publishedAt: this.parseNullableString(post, 'publishedAt'),
        previewImageUrl: this.parseNullableString(post, 'previewImageUrl'),
      },
    };
  }

  private parseNullableString(source: Prisma.JsonValue, key: string): string | null {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return null;
    }
    const value = (source as Prisma.JsonObject)[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private parseNullableNumber(source: Prisma.JsonValue, key: string): number | null {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return null;
    }
    const value = (source as Prisma.JsonObject)[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private mapRecordToDto(record: Notification): NotificationDto {
    const snapshot = this.parsePayload(record.payload);
    return {
      id: record.id,
      status: record.status,
      message: record.message ?? null,
      sentAt: record.sentAt,
      failedAt: record.failedAt,
      createdAt: record.createdAt,
      attemptCount: record.attemptCount,
      filter: snapshot?.filter ?? { id: record.savedFilterId, name: '' },
      post:
        snapshot?.post ??
        ({
          id: record.postId,
          title: null,
          displayTitle: null,
          description: null,
          priceTotal: null,
          rentAmount: null,
          depositAmount: null,
          cityName: null,
          districtName: null,
          provinceName: null,
          permalink: null,
          publishedAt: null,
          previewImageUrl: null,
        } as NotificationDto['post']),
    };
  }

  private castDecimal(value: Prisma.Decimal | number | null | undefined): number | null {
    if (value === null || typeof value === 'undefined') {
      return null;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (value instanceof Prisma.Decimal) {
      return Number(value.toString());
    }
    return null;
  }

  private resolveMediaFromRelation(media?: {
    url: string | null;
    thumbnailUrl: string | null;
    localUrl: string | null;
    localThumbnailUrl: string | null;
  }): string | null {
    if (!media) {
      return null;
    }
    return media.localThumbnailUrl ?? media.thumbnailUrl ?? media.localUrl ?? media.url ?? null;
  }
}
