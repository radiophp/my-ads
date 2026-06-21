import { Injectable, Logger } from '@nestjs/common';
import { MelkradarTransferStatus, PhoneFetchStatus } from '@prisma/client';
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
export class MelkradarPhoneTransferService {
  private readonly logger = new Logger(MelkradarPhoneTransferService.name);
  private readonly recentWindowMs = 4 * 60 * 60 * 1000; // last 4 hours

  constructor(private readonly prisma: PrismaService) {}

  async transferOne(_force = false): Promise<TransferResult> {
    const now = new Date();
    const lockUntil = new Date(now.getTime() + TRANSFER_LOCK_SECONDS * 1000);
    const cutoff = new Date(now.getTime() - this.recentWindowMs);

    const record = await this.prisma.$transaction(async (tx) => {
      const candidate = await tx.melkradarPhoneRecord.findFirst({
        where: {
          status: MelkradarTransferStatus.NOT_TRANSFERRED,
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

      await tx.melkradarPhoneRecord.update({
        where: { id: candidate.id },
        data: {
          status: MelkradarTransferStatus.IN_PROGRESS,
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

    if (post.phoneNumber) {
      await this.prisma.melkradarPhoneRecord.update({
        where: { id: record.id },
        data: {
          status: MelkradarTransferStatus.TRANSFERRED,
          transferredAt: now,
          transferLockedUntil: null,
          transferLastError: null,
        },
      });
      this.logger.log(
        `MelkRadar transfer skipped (post already has phone): ${record.externalId} (melkradarId=${record.melkradarId})`,
      );
      return { kind: 'skipped', reason: 'post_already_has_phone' };
    }

    const phoneNumber = record.phoneNumber ?? null;
    await this.prisma.$transaction(async (tx) => {
      await tx.divarPost.update({
        where: { id: post.id },
        data: {
          phoneNumber,
          ownerName: undefined,
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

      await tx.melkradarPhoneRecord.update({
        where: { id: record.id },
        data: {
          status: MelkradarTransferStatus.TRANSFERRED,
          transferredAt: now,
          transferLockedUntil: null,
          transferLastError: null,
        },
      });
    });

    this.logger.log(
      `MelkRadar transfer -> post ${record.externalId} phone=${phoneNumber ?? 'n/a'} (melkradarId=${record.melkradarId})`,
    );
    return { kind: 'transferred', externalId: record.externalId, phone: phoneNumber };
  }

  async transferMissingPosts(_force = false): Promise<BulkTransferResult> {
    const now = new Date();
    let total = 0;
    const cutoff = new Date(now.getTime() - this.recentWindowMs);

    while (true) {
      const records = await this.prisma.melkradarPhoneRecord.findMany({
        where: {
          externalId: { not: null },
          phoneNumber: { not: null },
          status: { not: MelkradarTransferStatus.TRANSFERRED },
          fetchedAt: { gte: cutoff },
        },
        orderBy: { fetchedAt: 'asc' },
      });

      if (records.length === 0) {
        break;
      }

      const externalIds = records
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

      await this.prisma.$transaction(
        async (tx) => {
          for (const record of records) {
            const post = record.externalId ? postByExternalId.get(record.externalId) : undefined;
            if (!post || !record.phoneNumber) {
              continue;
            }
            const phoneNumber = record.phoneNumber;
            await tx.divarPost.update({
              where: { id: post.id },
              data: {
                phoneNumber,
                ownerName: undefined,
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
            await tx.melkradarPhoneRecord.update({
              where: { id: record.id },
              data: {
                status: MelkradarTransferStatus.TRANSFERRED,
                transferredAt: now,
                transferLockedUntil: null,
                transferLastError: null,
              },
            });
            total += 1;
          }
        },
        { maxWait: 30_000, timeout: 120_000 },
      );
    }

    if (total === 0) {
      return { kind: 'skipped', reason: 'no_matches' };
    }

    this.logger.log(`MelkRadar bulk transfer applied to ${total} posts missing phone numbers.`);
    return { kind: 'transferred', count: total };
  }

  private async failRecord(id: string, reason: string, now: Date) {
    await this.prisma.melkradarPhoneRecord.update({
      where: { id },
      data: {
        status: MelkradarTransferStatus.NOT_TRANSFERRED,
        transferLockedUntil: null,
        transferLastError: reason,
        nextTransferAttemptAt: new Date(now.getTime() + NO_POST_BACKOFF_MS),
      },
    });
  }

  private async deferRecord(id: string, reason: string, until: Date, now: Date) {
    await this.prisma.melkradarPhoneRecord.update({
      where: { id },
      data: {
        status: MelkradarTransferStatus.NOT_TRANSFERRED,
        transferLockedUntil: null,
        transferLastError: reason,
        nextTransferAttemptAt: until,
        updatedAt: now,
      },
    });
  }
}
