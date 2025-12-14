import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import { PhoneFetchStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import axios from 'axios';

const LOCK_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class PhoneFetchService {
  private readonly logger = new Logger(PhoneFetchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async lease(workerId?: string): Promise<{
    leaseId: string;
    postId: string;
    externalId: string;
    contactUuid: string;
    postTitle?: string | null;
    businessRef?: string | null;
    businessType?: string | null;
    businessCacheState?: 'new' | 'update';
  } | null> {
    const now = new Date();
    const lockUntil = new Date(now.getTime() + LOCK_SECONDS * 1000);
    const leaseId = randomUUID();

    const post = await this.prisma.$transaction(async (tx) => {
      const candidate = await tx.divarPost.findFirst({
        where: {
          contactUuid: { not: null },
          phoneNumber: null,
          phoneFetchAttemptCount: { lt: MAX_ATTEMPTS },
          OR: [
            { phoneFetchStatus: PhoneFetchStatus.PENDING },
            {
              phoneFetchStatus: PhoneFetchStatus.IN_PROGRESS,
              phoneFetchLockedUntil: { lt: now },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          externalId: true,
          contactUuid: true,
          rawPayload: true,
          businessRef: true,
          businessType: true,
          title: true,
        },
      });

      if (!candidate) {
        return null;
      }

      const businessRef =
        candidate.businessRef ?? (candidate.rawPayload as any)?.webengage?.business_ref ?? null;
      let businessCacheState: 'new' | 'update' | undefined;

      // If businessRef already cached and fresh, set phone immediately and skip leasing
      if (businessRef) {
        const cache = await tx.businessPhoneCache.findUnique({
          where: { businessRef },
          select: { phoneNumber: true, fetchedAt: true, lockedUntil: true },
        });
        businessCacheState = cache ? 'update' : 'new';
        if (cache?.phoneNumber && cache.fetchedAt.getTime() > now.getTime() - CACHE_TTL_MS) {
          await tx.divarPost.update({
            where: { id: candidate.id },
            data: {
              businessRef,
              phoneNumber: cache.phoneNumber,
              phoneFetchStatus: PhoneFetchStatus.DONE,
              phoneFetchLeaseId: null,
              phoneFetchLockedUntil: null,
              phoneFetchLastError: null,
            },
          });
          return null;
        }

        if (cache?.lockedUntil && cache.lockedUntil > now) {
          // Someone else refreshing this business; push post back
          await tx.divarPost.update({
            where: { id: candidate.id },
            data: { phoneFetchStatus: PhoneFetchStatus.PENDING, phoneFetchLockedUntil: null },
          });
          return null;
        }

        // Acquire/refresh cache lock
        await tx.businessPhoneCache.upsert({
          where: { businessRef },
          update: { lockedUntil: lockUntil },
          create: { businessRef, lockedUntil: lockUntil },
        });
      }

      await tx.divarPost.update({
        where: { id: candidate.id },
        data: {
          businessRef:
            businessRef ?? (candidate.rawPayload as any)?.webengage?.business_ref ?? null,
          phoneFetchStatus: PhoneFetchStatus.IN_PROGRESS,
          phoneFetchLockedUntil: lockUntil,
          phoneFetchLeaseId: leaseId,
          phoneFetchWorker: workerId ?? null,
          phoneFetchAttemptCount: { increment: 1 },
          phoneFetchLastError: null,
        },
      });

      return {
        ...candidate,
        businessRef,
        businessType: candidate.businessType,
        businessCacheState,
      };
    });

    if (!post) {
      return null;
    }

    return {
      leaseId,
      postId: post.id,
      externalId: post.externalId,
      contactUuid: post.contactUuid!,
      businessRef: (post as any).businessRef ?? null,
      businessType: (post as any).businessType ?? null,
      businessCacheState: (post as any).businessCacheState,
      postTitle: (post as any).title ?? null,
    };
  }

  async reportOk(leaseId: string, phoneNumber: string): Promise<void> {
    const now = new Date();
    const post = await this.prisma.divarPost.findFirst({
      where: { phoneFetchLeaseId: leaseId },
      select: { id: true, businessRef: true, rawPayload: true },
    });
    if (!post) return;
    const businessRef =
      post.businessRef ?? (post.rawPayload as any)?.webengage?.business_ref ?? null;
    let businessTitle: string | undefined;

    await this.prisma.$transaction(async (tx) => {
      if (businessRef) {
        businessTitle = await this.fetchBusinessTitle(businessRef).catch(() => undefined);
      }

      await tx.divarPost.updateMany({
        where: {
          OR: [{ phoneFetchLeaseId: leaseId }, businessRef ? { businessRef } : { id: post.id }],
        },
        data: {
          phoneNumber,
          phoneFetchStatus: PhoneFetchStatus.DONE,
          phoneFetchLeaseId: null,
          phoneFetchLockedUntil: null,
          businessRef: businessRef ?? undefined,
        },
      });

      if (businessRef) {
        await tx.businessPhoneCache.upsert({
          where: { businessRef },
          update: {
            phoneNumber,
            fetchedAt: now,
            lockedUntil: null,
            title: businessTitle ?? undefined,
            titleFetchedAt: businessTitle ? now : undefined,
          },
          create: {
            businessRef,
            phoneNumber,
            fetchedAt: now,
            lockedUntil: null,
            title: businessTitle ?? undefined,
            titleFetchedAt: businessTitle ? now : undefined,
          },
        });
      }
    });
  }

  async reportError(leaseId: string, error: string): Promise<void> {
    const now = new Date();
    const post = await this.prisma.divarPost.findFirst({
      where: { phoneFetchLeaseId: leaseId },
      select: { businessRef: true, rawPayload: true },
    });
    const businessRef =
      post?.businessRef ?? (post?.rawPayload as any)?.webengage?.business_ref ?? null;

    await this.prisma.$transaction(async (tx) => {
      await tx.divarPost.updateMany({
        where: { phoneFetchLeaseId: leaseId },
        data: {
          phoneFetchStatus: PhoneFetchStatus.FAILED,
          phoneFetchLockedUntil: now,
          phoneFetchLeaseId: null,
          phoneFetchLastError: error,
        },
      });

      if (businessRef) {
        await tx.businessPhoneCache.updateMany({
          where: { businessRef },
          data: { lockedUntil: null },
        });
      }
    });
  }

  private async fetchBusinessTitle(businessRef: string): Promise<string | undefined> {
    const url = `https://api.divar.ir/v8/premium-user/web/business/brand-landing/${businessRef}`;
    const res = await axios.get(url, {
      timeout: 8000,
      validateStatus: () => true,
    });
    if (res.status >= 200 && res.status < 300) {
      const data = res.data ?? {};
      const headerList: any[] = Array.isArray(data.header_widget_list)
        ? (data.header_widget_list as any[])
        : [];
      const headerTitle =
        headerList.find((w: any) => w?.widget_type === 'LEGEND_TITLE_ROW')?.data?.title ??
        data.title;
      if (typeof headerTitle === 'string' && headerTitle.trim().length > 0) {
        return headerTitle.trim();
      }
    }
    return undefined;
  }
}
