import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ArkaTransferStatus, PhoneFetchStatus } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';

const TRANSFER_LOCK_SECONDS = 60;
const NO_POST_BACKOFF_MS = 10 * 60 * 1000; // 10 minutes

type TransferResult =
  | { kind: 'skipped'; reason: string }
  | { kind: 'transferred'; externalId: string; phone: string | null }
  | { kind: 'deferred'; reason: string; until?: Date }
  | { kind: 'error'; reason: string };

type BulkTransferResult =
  | { kind: 'skipped'; reason: string }
  | { kind: 'transferred'; count: number };

@Injectable()
export class ArkaPhoneTransferService {
  private readonly logger = new Logger(ArkaPhoneTransferService.name);
  private readonly schedulerEnabled: boolean;
  private readonly transferCronEnabled: boolean;
  private readonly recentWindowMs = 4 * 60 * 60 * 1000; // last 4 hours

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.schedulerEnabled =
      configService.get<boolean>('scheduler.enabled', { infer: true }) ?? false;
    this.transferCronEnabled =
      (process.env['ENABLE_ARKA_TRANSFER_CRON'] ?? '').toLowerCase() === 'true';
  }

  @Cron(CronExpression.EVERY_5_SECONDS, { name: 'arka-phone-transfer' })
  async cronTick() {
    await this.transferOne(false).catch((error) =>
      this.logger.debug(
        `Cron transfer error: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }

  async transferOne(force = false): Promise<TransferResult> {
    if (!force && (!this.schedulerEnabled || !this.transferCronEnabled)) {
      return { kind: 'skipped', reason: 'cron_disabled' };
    }

    const now = new Date();
    const lockUntil = new Date(now.getTime() + TRANSFER_LOCK_SECONDS * 1000);
    const cutoff = new Date(now.getTime() - this.recentWindowMs);

    const record = await this.prisma.$transaction(async (tx) => {
      const candidate = await tx.arkaPhoneRecord.findFirst({
        where: {
          status: ArkaTransferStatus.NOT_TRANSFERRED,
          fetchedAt: { gte: cutoff },
          AND: [
            { OR: [{ transferLockedUntil: null }, { transferLockedUntil: { lt: now } }] },
            { OR: [{ nextTransferAttemptAt: null }, { nextTransferAttemptAt: { lte: now } }] },
          ],
        },
        orderBy: [{ fetchedAt: 'asc' }],
      });

      if (!candidate) {
        return null;
      }

      await tx.arkaPhoneRecord.update({
        where: { id: candidate.id },
        data: {
          status: ArkaTransferStatus.IN_PROGRESS,
          transferLockedUntil: lockUntil,
          transferAttemptCount: { increment: 1 },
          transferLastError: null,
          nextTransferAttemptAt: null,
        },
      });

      return candidate;
    });

    if (!record) {
      return { kind: 'skipped', reason: 'no_pending_records' };
    }

    if (!record.externalId) {
      await this.failRecord(record.id, 'missing_external_id', now);
      return { kind: 'error', reason: 'missing_external_id' };
    }

    const post = await this.prisma.divarPost.findUnique({
      where: { externalId: record.externalId },
      select: { id: true, businessRef: true, phoneNumber: true },
    });

    if (!post) {
      const nextAttempt = new Date(now.getTime() + NO_POST_BACKOFF_MS);
      await this.deferRecord(record.id, 'post_not_found', nextAttempt, now);
      return { kind: 'deferred', reason: 'post_not_found', until: nextAttempt };
    }

    const phoneNumber = record.phoneNumber === '09000000000' ? null : (record.phoneNumber ?? null);
    const ownerName = record.malkName ?? null;
    await this.prisma.$transaction(async (tx) => {
      await tx.divarPost.update({
        where: { id: post.id },
        data: {
          phoneNumber,
          ownerName: ownerName ?? undefined,
          phoneFetchStatus: PhoneFetchStatus.DONE,
          phoneFetchLockedUntil: null,
          phoneFetchLeaseId: null,
          phoneFetchWorker: null,
          phoneFetchLastError: null,
        },
      });

      if (post.businessRef && phoneNumber) {
        await tx.businessPhoneCache.upsert({
          where: { businessRef: post.businessRef },
          update: {
            phoneNumber,
            fetchedAt: now,
            lockedUntil: null,
            updatedAt: now,
          },
          create: {
            businessRef: post.businessRef,
            phoneNumber,
            fetchedAt: now,
            lockedUntil: null,
          },
        });
      }

      await tx.arkaPhoneRecord.update({
        where: { id: record.id },
        data: {
          status: ArkaTransferStatus.TRANSFERRED,
          transferredAt: now,
          transferLockedUntil: null,
          transferLastError: null,
        },
      });
    });

    this.logger.log(
      `Arka transfer -> post ${record.externalId} phone=${phoneNumber ?? 'n/a'} (arkaId=${record.arkaId})`,
    );
    return { kind: 'transferred', externalId: record.externalId, phone: phoneNumber };
  }

  private async failRecord(id: string, reason: string, now: Date) {
    await this.prisma.arkaPhoneRecord.update({
      where: { id },
      data: {
        status: ArkaTransferStatus.NOT_TRANSFERRED,
        transferLockedUntil: null,
        transferLastError: reason,
        nextTransferAttemptAt: new Date(now.getTime() + NO_POST_BACKOFF_MS),
      },
    });
  }

  private async deferRecord(id: string, reason: string, until: Date, now: Date) {
    await this.prisma.arkaPhoneRecord.update({
      where: { id },
      data: {
        status: ArkaTransferStatus.NOT_TRANSFERRED,
        transferLockedUntil: null,
        transferLastError: reason,
        nextTransferAttemptAt: until,
        updatedAt: now,
      },
    });
  }

  async transferMissingPosts(force = false): Promise<BulkTransferResult> {
    if (!force && (!this.schedulerEnabled || !this.transferCronEnabled)) {
      return { kind: 'skipped', reason: 'cron_disabled' };
    }

    const now = new Date();
    let total = 0;
    const cutoff = new Date(now.getTime() - this.recentWindowMs);

    // Process in batches until no more matches
    while (true) {
      const arkaRecords = await this.prisma.arkaPhoneRecord.findMany({
        where: {
          externalId: { not: null },
          phoneNumber: { not: null },
          NOT: { phoneNumber: '09000000000' },
          status: { not: ArkaTransferStatus.TRANSFERRED },
          fetchedAt: { gte: cutoff },
        },
        orderBy: { fetchedAt: 'asc' },
      });

      if (arkaRecords.length === 0) {
        break;
      }

      const externalIds = arkaRecords
        .map((r) => r.externalId)
        .filter((id): id is string => Boolean(id));

      const posts = await this.prisma.divarPost.findMany({
        where: { externalId: { in: externalIds }, phoneNumber: null },
        select: { id: true, externalId: true, businessRef: true },
      });

      if (posts.length === 0) {
        break;
      }

      const postByExternalId = new Map(posts.map((p) => [p.externalId, p]));

      await this.prisma.$transaction(async (tx) => {
        for (const record of arkaRecords) {
          const post = record.externalId ? postByExternalId.get(record.externalId) : undefined;
          if (!post || !record.phoneNumber || record.phoneNumber === '09000000000') {
            continue;
          }
          const phoneNumber = record.phoneNumber;
          const ownerName = record.malkName ?? null;
          await tx.divarPost.update({
            where: { id: post.id },
            data: {
              phoneNumber,
              ownerName: ownerName ?? undefined,
              phoneFetchStatus: PhoneFetchStatus.DONE,
              phoneFetchLockedUntil: null,
              phoneFetchLeaseId: null,
              phoneFetchWorker: null,
              phoneFetchLastError: null,
            },
          });
          if (post.businessRef) {
            await tx.businessPhoneCache.upsert({
              where: { businessRef: post.businessRef },
              update: {
                phoneNumber,
                fetchedAt: now,
                lockedUntil: null,
                updatedAt: now,
              },
              create: {
                businessRef: post.businessRef,
                phoneNumber,
                fetchedAt: now,
                lockedUntil: null,
              },
            });
          }
          await tx.arkaPhoneRecord.update({
            where: { id: record.id },
            data: {
              status: ArkaTransferStatus.TRANSFERRED,
              transferredAt: now,
              transferLockedUntil: null,
              transferLastError: null,
            },
          });
          total += 1;
        }
      });
    }

    if (total === 0) {
      return { kind: 'skipped', reason: 'no_matches' };
    }

    this.logger.log(`Arka bulk transfer applied to ${total} posts missing phone numbers.`);
    return { kind: 'transferred', count: total };
  }
}
