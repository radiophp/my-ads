import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';
import { PhoneFetchStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const LOCK_SECONDS = 60;
const MAX_ATTEMPTS = 5;

@Injectable()
export class PhoneFetchService {
  private readonly logger = new Logger(PhoneFetchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async lease(workerId?: string): Promise<{
    leaseId: string;
    postId: string;
    externalId: string;
    contactUuid: string;
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
        select: { id: true, externalId: true, contactUuid: true },
      });

      if (!candidate) {
        return null;
      }

      await tx.divarPost.update({
        where: { id: candidate.id },
        data: {
          phoneFetchStatus: PhoneFetchStatus.IN_PROGRESS,
          phoneFetchLockedUntil: lockUntil,
          phoneFetchLeaseId: leaseId,
          phoneFetchWorker: workerId ?? null,
          phoneFetchAttemptCount: { increment: 1 },
          phoneFetchLastError: null,
        },
      });

      return candidate;
    });

    if (!post) {
      return null;
    }

    return {
      leaseId,
      postId: post.id,
      externalId: post.externalId,
      contactUuid: post.contactUuid!,
    };
  }

  async reportOk(leaseId: string, phoneNumber: string): Promise<void> {
    await this.prisma.divarPost.updateMany({
      where: { phoneFetchLeaseId: leaseId },
      data: {
        phoneNumber,
        phoneFetchStatus: PhoneFetchStatus.DONE,
        phoneFetchLeaseId: null,
        phoneFetchLockedUntil: null,
      },
    });
  }

  async reportError(leaseId: string, error: string): Promise<void> {
    const now = new Date();
    await this.prisma.divarPost.updateMany({
      where: { phoneFetchLeaseId: leaseId },
      data: {
        phoneFetchStatus: PhoneFetchStatus.FAILED,
        phoneFetchLockedUntil: now,
        phoneFetchLeaseId: null,
        phoneFetchLastError: error,
      },
    });
  }
}
