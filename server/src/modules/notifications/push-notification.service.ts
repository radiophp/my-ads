import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PushSubscription } from '@prisma/client';
import * as webPush from 'web-push';

import type { PushConfig } from '@app/platform/config/push.config';
import { PrismaService } from '@app/platform/database/prisma.service';
import type { RealtimeNotificationPayload } from './notification.types';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    const cfg = configService.get<PushConfig>('push', { infer: true });
    if (cfg?.vapidPublicKey && cfg?.vapidPrivateKey) {
      this.enabled = true;
      webPush.setVapidDetails(
        cfg.subject ?? 'mailto:admin@example.com',
        cfg.vapidPublicKey,
        cfg.vapidPrivateKey,
      );
    } else {
      this.enabled = false;
    }
  }

  async registerSubscription(
    userId: string,
    params: { endpoint: string; p256dh: string; auth: string },
  ): Promise<PushSubscription> {
    if (!this.enabled) {
      throw new Error('Push notifications are not enabled (missing VAPID keys).');
    }
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: params.endpoint },
      create: {
        userId,
        endpoint: params.endpoint,
        p256dh: params.p256dh,
        auth: params.auth,
      },
      update: {
        userId,
        p256dh: params.p256dh,
        auth: params.auth,
      },
    });
  }

  async removeSubscription(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.delete({ where: { endpoint } }).catch(() => undefined);
  }

  async sendToUser(userId: string, payload: RealtimeNotificationPayload): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) {
      return false;
    }

    const body = {
      title: payload.post.title ?? 'New matched ad',
      body: payload.filter?.name
        ? `${payload.filter.name}${payload.post.cityName ? ' • ' + payload.post.cityName : ''}`
        : (payload.post.cityName ?? 'New notification'),
      url: payload.post.permalink ?? `/dashboard/posts/${payload.post.id}`,
      icon: payload.post.previewImageUrl ?? '/icons/icon-192x192.png',
      tag: payload.id,
    };

    let delivered = false;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify(body),
          );
          delivered = true;
        } catch (error) {
          const message = (error as { statusCode?: number })?.statusCode;
          if (message === 404 || message === 410) {
            await this.removeSubscription(sub.endpoint);
          }
          this.logger.warn(`Push delivery failed for user ${userId}: ${String(error)}`);
        }
      }),
    );
    return delivered;
  }
}
