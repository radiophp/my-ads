import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PushSubscription } from '@prisma/client';
import * as webPush from 'web-push';

import type { PushConfig } from '@app/platform/config/push.config';
import { PrismaService } from '@app/platform/database/prisma.service';
import type { RealtimeNotificationPayload } from './notification.types';

export type PushDeliveryResult = {
  delivered: boolean;
  attempted: boolean;
  reason?: 'disabled' | 'no_subscriptions' | 'send_error' | 'timeout';
  error?: string;
};

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly enabled: boolean;
  private readonly timeoutMs: number;
  private readonly ttlSeconds = 3600;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    const cfg = configService.get<PushConfig>('push', { infer: true });
    if (cfg?.vapidPublicKey && cfg?.vapidPrivateKey) {
      this.enabled = true;
      this.timeoutMs = cfg.timeoutMs;
      webPush.setVapidDetails(
        cfg.subject ?? 'mailto:admin@example.com',
        cfg.vapidPublicKey,
        cfg.vapidPrivateKey,
      );
    } else {
      this.enabled = false;
      this.timeoutMs = cfg?.timeoutMs ?? 8000;
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

  async sendToUser(
    userId: string,
    payload: RealtimeNotificationPayload,
  ): Promise<PushDeliveryResult> {
    if (!this.enabled) {
      return { delivered: false, attempted: false, reason: 'disabled' };
    }
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) {
      return { delivered: false, attempted: false, reason: 'no_subscriptions' };
    }

    const body = {
      title: payload.post.title ?? 'New matched ad',
      body: payload.filter?.name
        ? `${payload.filter.name}${payload.post.cityName ? ' • ' + payload.post.cityName : ''}`
        : (payload.post.cityName ?? 'New notification'),
      url: payload.post.permalink ?? `/dashboard/posts/${payload.post.id}`,
      icon: payload.post.previewImageUrl ?? '/fav/android-chrome-192x192.png',
      badge: '/fav/favicon-32x32.png',
      tag: payload.id,
      notificationId: payload.id,
    };

    let delivered = false;
    let hadError = false;
    let hadTimeout = false;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await this.withTimeout(
            webPush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              JSON.stringify(body),
              {
                TTL: this.ttlSeconds,
                urgency: 'high',
              },
            ),
            this.timeoutMs,
          );
          delivered = true;
        } catch (error) {
          hadError = true;
          if (error instanceof Error && error.message === 'push_timeout') {
            hadTimeout = true;
          }
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.removeSubscription(sub.endpoint);
          }
          this.logger.warn(`Push delivery failed for user ${userId}: ${String(error)}`);
        }
      }),
    );
    if (delivered) {
      return { delivered: true, attempted: true };
    }
    if (hadTimeout) {
      return { delivered: false, attempted: true, reason: 'timeout' };
    }
    if (hadError) {
      return { delivered: false, attempted: true, reason: 'send_error' };
    }
    return { delivered: false, attempted: true, reason: 'send_error' };
  }

  private async withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error('push_timeout'));
      }, timeoutMs);
    });

    try {
      return await Promise.race([task, timeoutPromise]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
