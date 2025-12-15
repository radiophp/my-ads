import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import { PhoneFetchStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import axios from 'axios';

const LOCK_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TITLE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
    needsBusinessTitle?: boolean;
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
      let needsBusinessTitle = false;

      // If businessRef already cached and fresh, set phone immediately and skip leasing
      if (businessRef) {
        const cache = await tx.businessPhoneCache.findUnique({
          where: { businessRef },
          select: {
            phoneNumber: true,
            fetchedAt: true,
            lockedUntil: true,
            title: true,
            titleFetchedAt: true,
          },
        });
        businessCacheState = cache ? 'update' : 'new';
        needsBusinessTitle =
          !cache?.title ||
          !cache.titleFetchedAt ||
          cache.titleFetchedAt.getTime() < now.getTime() - TITLE_TTL_MS;
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
        needsBusinessTitle,
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
      needsBusinessTitle: (post as any).needsBusinessTitle ?? false,
    };
  }

  async reportOk(leaseId: string, phoneNumber: string, businessTitle?: string): Promise<void> {
    const now = new Date();
    const post = await this.prisma.divarPost.findFirst({
      where: { phoneFetchLeaseId: leaseId },
      select: { id: true, businessRef: true, rawPayload: true },
    });
    if (!post) return;
    const businessRef =
      post.businessRef ?? (post.rawPayload as any)?.webengage?.business_ref ?? null;
    let resolvedBusinessTitle = businessTitle;

    await this.prisma.$transaction(async (tx) => {
      if (businessRef) {
        if (!resolvedBusinessTitle) {
          resolvedBusinessTitle = await this.fetchBusinessTitle(businessRef).catch(() => undefined);
        }
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
            title: resolvedBusinessTitle ?? undefined,
            titleFetchedAt: resolvedBusinessTitle ? now : undefined,
          },
          create: {
            businessRef,
            phoneNumber,
            fetchedAt: now,
            lockedUntil: null,
            title: resolvedBusinessTitle ?? undefined,
            titleFetchedAt: resolvedBusinessTitle ? now : undefined,
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

  public async fetchBusinessTitle(businessRef: string): Promise<string | undefined> {
    const brandToken = businessRef?.includes('_')
      ? (businessRef.split('_')[1] ?? businessRef)
      : businessRef;
    const url = `https://api.divar.ir/v8/premium-user/web/business/brand-landing/${brandToken}`;

    const session = await this.prisma.adminDivarSession.findFirst({
      where: { active: true, locked: false },
      orderBy: { updatedAt: 'desc' },
    });
    const authHeader =
      session && session.jwt
        ? session.jwt.startsWith('Basic ')
          ? session.jwt
          : `Basic ${session.jwt}`
        : undefined;
    const rawJwt = session?.jwt?.replace(/^Basic\s+/i, '');

    const res = await axios.post(
      url,
      {},
      {
        timeout: 8000,
        validateStatus: () => true,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:146.0) Gecko/20100101 Firefox/146.0',
          Accept: 'application/json, text/plain, */*',
          Referer: 'https://divar.ir/',
          Origin: 'https://divar.ir',
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(rawJwt ? { Cookie: `token=${rawJwt}` } : {}),
        },
      },
    );

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
    this.logger.warn(
      `Business title fetch failed for ${businessRef}: status=${res.status} body=${typeof res.data === 'string' ? res.data.slice(0, 150) : JSON.stringify(res.data ?? {}).slice(0, 150)}`,
    );
    return undefined;
  }
}
