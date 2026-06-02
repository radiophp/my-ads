import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/platform/database/prisma.service';
import { PhoneFetchService } from './phone-fetch.service';

const TITLE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TITLE_LOCK_SECONDS = 60;

@Injectable()
export class BusinessTitleRefreshService {
  private readonly logger = new Logger(BusinessTitleRefreshService.name);
  private readonly schedulerEnabled: boolean;
  private readonly titleCronEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneFetchService: PhoneFetchService,
    configService: ConfigService,
  ) {
    this.schedulerEnabled =
      configService.get<boolean>('scheduler.enabled', { infer: true }) ?? false;
    this.titleCronEnabled =
      (process.env['ENABLE_BUSINESS_TITLE_CRON'] ?? '').toLowerCase() === 'true';
  }

  // Runs every second, processes at most one business needing a title fill/refresh
  @Cron(CronExpression.EVERY_SECOND, { name: 'business-title-refresh' })
  async refreshOne(force = false): Promise<{ businessRef: string; title?: string | null } | null> {
    if (!force && (!this.schedulerEnabled || !this.titleCronEnabled)) {
      return null;
    }

    const now = new Date();
    const staleAfter = new Date(now.getTime() - TITLE_CACHE_TTL_MS);
    const lockUntil = new Date(now.getTime() + TITLE_LOCK_SECONDS * 1000);

    const candidate = await this.prisma.$transaction(async (tx) => {
      const record = await tx.businessPhoneCache.findFirst({
        where: {
          AND: [
            {
              OR: [{ title: null }, { titleFetchedAt: { lt: staleAfter } }],
            },
            {
              OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
            },
          ],
        },
        orderBy: [{ titleFetchedAt: 'asc' }, { updatedAt: 'asc' }],
      });

      if (!record) {
        return null;
      }

      await tx.businessPhoneCache.update({
        where: { id: record.id },
        data: { lockedUntil: lockUntil },
      });

      return record;
    });

    if (!candidate) {
      return null;
    }

    const title = await this.phoneFetchService
      .fetchBusinessTitle(candidate.businessRef)
      .catch((error: Error) => {
        this.logger.warn(
          `Failed to fetch title for business ${candidate.businessRef}: ${error.message}`,
        );
        return undefined;
      });

    const resolvedTitle = title ?? candidate.title ?? null;
    this.logger.log(
      `Title refresh: business=${candidate.businessRef} _ title="${resolvedTitle ?? '—'}"`,
    );

    await this.prisma.businessPhoneCache.update({
      where: { id: candidate.id },
      data: {
        title: resolvedTitle,
        titleFetchedAt: new Date(),
        lockedUntil: null,
      },
    });

    return { businessRef: candidate.businessRef, title: resolvedTitle };
  }
}
