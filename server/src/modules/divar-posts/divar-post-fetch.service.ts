import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/platform/database/prisma.service';
import {
  PostQueueStatus,
  PostAnalysisStatus,
  type PostToReadQueue,
  type Prisma,
} from '@prisma/client';

const DIVAR_POST_DETAILS_URL = 'https://api.divar.ir/v8/posts-v2/web';
const DEFAULT_BATCH_SIZE = 2;
const MAX_ATTEMPTS = 5;
const MIN_BATCH_INTERVAL_MS = 1000;
const DEFAULT_RATE_LIMIT_SLEEP_MS = 5000;

class DivarHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly headers: Record<string, string>,
  ) {
    super(message);
  }

  getRetryAfterMs(): number | null {
    const retryAfter = this.headers['retry-after'] ?? this.headers['Retry-After'];
    if (!retryAfter) {
      return null;
    }

    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds)) {
      return seconds * 1000;
    }

    const retryDate = Date.parse(retryAfter);
    if (!Number.isNaN(retryDate)) {
      return Math.max(retryDate - Date.now(), 0);
    }

    return null;
  }
}

interface FetchJobResult {
  job: PostToReadQueue;
  success: boolean;
}

@Injectable()
export class DivarPostFetchService {
  private readonly logger = new Logger(DivarPostFetchService.name);
  private readonly sessionCookie?: string;
  private readonly batchSize: number;
  private readonly requestTimeoutMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.sessionCookie = this.configService.get<string>('DIVAR_SESSION_COOKIE');
    this.batchSize =
      this.configService.get<number>('DIVAR_POST_FETCH_BATCH_SIZE', { infer: true }) ??
      DEFAULT_BATCH_SIZE;
    this.requestTimeoutMs =
      this.configService.get<number>('DIVAR_POST_FETCH_TIMEOUT_MS', { infer: true }) ?? 15000;
  }

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'divar-post-fetch',
    disabled: true, // Enable once cron should run automatically.
  })
  async scheduledFetch(): Promise<void> {
    await this.fetchNextPosts();
  }

  async fetchNextPosts(): Promise<{ attempted: number; succeeded: number; failed: number }> {
    const summary = { attempted: 0, succeeded: 0, failed: 0 };

    while (true) {
      const batch = await this.reserveBatch();
      if (batch.length === 0) {
        if (summary.attempted === 0) {
          this.logger.log('No pending posts to fetch.');
        }
        break;
      }

      const batchStart = Date.now();
      summary.attempted += batch.length;

      this.logger.log(
        `Fetching ${batch.length} posts in parallel (tokens: ${batch
          .map((job) => job.externalId)
          .join(', ')})`,
      );

      const results = await Promise.all(batch.map((job) => this.processJob(job)));

      const batchSuccess = results.filter((result) => result.success).length;
      const batchFailure = results.length - batchSuccess;
      summary.succeeded += batchSuccess;
      summary.failed += batchFailure;

      this.logger.log(
        `Batch finished: success=${batchSuccess} failure=${batchFailure} (processed ${summary.attempted} total).`,
      );

      if (batch.length < this.batchSize) {
        break;
      }

      const elapsed = Date.now() - batchStart;
      if (elapsed < MIN_BATCH_INTERVAL_MS) {
        await this.sleep(MIN_BATCH_INTERVAL_MS - elapsed);
      }
    }

    this.logger.log(
      `Divar post fetch summary: attempted=${summary.attempted}, succeeded=${summary.succeeded}, failed=${summary.failed}`,
    );

    return summary;
  }

  private async reserveBatch(): Promise<PostToReadQueue[]> {
    return this.prisma.$transaction(async (tx) => {
      const jobs = await tx.postToReadQueue.findMany({
        where: { status: PostQueueStatus.PENDING },
        orderBy: [{ requestedAt: 'asc' }],
        take: this.batchSize,
      });

      if (jobs.length === 0) {
        return [];
      }

      await tx.postToReadQueue.updateMany({
        where: { id: { in: jobs.map((job) => job.id) } },
        data: { status: PostQueueStatus.PROCESSING },
      });

      return jobs;
    });
  }

  private async processJob(job: PostToReadQueue): Promise<FetchJobResult> {
    try {
      const payload = await this.fetchPostPayload(job.externalId);
      await this.prisma.$transaction(async (tx) => {
        await tx.postToReadQueue.update({
          where: { id: job.id },
          data: {
            status: PostQueueStatus.COMPLETED,
            lastFetchedAt: new Date(),
          },
        });

        await tx.postToAnalyzeQueue.upsert({
          where: { readQueueId: job.id },
          create: {
            readQueueId: job.id,
            source: job.source,
            externalId: job.externalId,
            payload: payload as Prisma.InputJsonValue,
            status: PostAnalysisStatus.PENDING,
          },
          update: {
            payload: payload as Prisma.InputJsonValue,
            status: PostAnalysisStatus.PENDING,
            errorMessage: null,
          },
        });
      });

      this.logger.log(`Fetched post ${job.externalId} successfully.`);
      return { job, success: true };
    } catch (error) {
      if (error instanceof DivarHttpError && error.status === 429) {
        const retryAfter = error.getRetryAfterMs() ?? DEFAULT_RATE_LIMIT_SLEEP_MS;
        this.logger.warn(
          `Rate limit encountered; sleeping for ${retryAfter}ms (headers=${JSON.stringify(
            error.headers,
          )}).`,
        );
        await this.sleep(retryAfter);
      }

      await this.markFailure(job, error as Error);
      return { job, success: false };
    }
  }

  private async fetchPostPayload(token: string): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(`${DIVAR_POST_DETAILS_URL}/${token}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MyAdsBot/1.0)',
          Accept: 'application/json, text/plain, */*',
          Referer: 'https://divar.ir/',
          Origin: 'https://divar.ir',
          ...(this.sessionCookie ? { Cookie: this.sessionCookie } : {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const headersSnapshot = Object.fromEntries(
          Array.from(response.headers.entries()).map(([key, value]) => [key.toLowerCase(), value]),
        );
        throw new DivarHttpError(
          `Divar post fetch failed with ${response.status} ${response.statusText}.`,
          response.status,
          headersSnapshot,
        );
      }

      return (await response.json()) as Record<string, unknown>;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async markFailure(job: PostToReadQueue, error: Error): Promise<void> {
    const nextAttempts = job.fetchAttempts + 1;
    const status = nextAttempts >= MAX_ATTEMPTS ? PostQueueStatus.FAILED : PostQueueStatus.PENDING;

    await this.prisma.postToReadQueue.update({
      where: { id: job.id },
      data: {
        fetchAttempts: nextAttempts,
        status,
        lastFetchedAt: new Date(),
      },
    });

    const level = status === PostQueueStatus.FAILED ? 'error' : 'warn';
    this.logger[level](
      `Post ${job.externalId} fetch failed (attempt ${nextAttempts}/${MAX_ATTEMPTS}). Status=${status}. Error: ${error.message}`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
