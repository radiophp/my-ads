import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@app/platform/database/prisma.service';
import {
  PostAnalysisStatus,
  Prisma,
  type PostToAnalyzeQueue,
  type PostToReadQueue,
} from '@prisma/client';
import {
  DivarPostParser,
  type ParsedDivarPost,
  type ParsedAttribute,
  type ParsedMedia,
} from './divar-post-parser';
import { schedulerCronExpressions } from '@app/platform/config/scheduler.config';

const MAX_ANALYZE_ATTEMPTS = 5;
const RATE_LIMIT_BATCH_SIZE = 50;
const RATE_LIMIT_INTERVAL_MS = 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface AnalyzeJob extends PostToAnalyzeQueue {
  readQueue: PostToReadQueue & {
    category?: { id: string } | null;
    city?: { id: number; slug: string; name: string } | null;
    province?: { id: number; name: string } | null;
  };
}

interface ProcessSummary {
  processed: number;
  failed: number;
}

@Injectable()
export class DivarPostAnalyzeService {
  private readonly logger = new Logger(DivarPostAnalyzeService.name);
  private readonly parser = new DivarPostParser();
  private readonly batchSize: number;
  private readonly districtCache = new Map<string, number | null>();
  private analyzeRunning = false;
  private readonly schedulerEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.batchSize =
      configService.get<number>('DIVAR_POST_ANALYZE_BATCH_SIZE', { infer: true }) ?? 100;
    this.schedulerEnabled =
      configService.get<boolean>('scheduler.enabled', { infer: true }) ?? false;
  }

  @Cron(schedulerCronExpressions.divarAnalyze, { name: 'divar-post-analyze' })
  async scheduledAnalyze(): Promise<void> {
    if (!this.schedulerEnabled) {
      return;
    }
    if (this.analyzeRunning) {
      this.logger.warn('Skipping analyze cron tick because a previous run is still in progress.');
      return;
    }
    this.analyzeRunning = true;
    try {
      await this.processPendingJobs();
    } finally {
      this.analyzeRunning = false;
    }
  }

  async processPendingJobs(batchSize = this.batchSize): Promise<ProcessSummary> {
    const summary: ProcessSummary = { processed: 0, failed: 0 };
    let iteration = 0;

    while (true) {
      const jobs = await this.prisma.postToAnalyzeQueue.findMany({
        where: { status: PostAnalysisStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        take: batchSize,
        include: {
          readQueue: {
            include: {
              category: { select: { id: true } },
              city: { select: { id: true, slug: true, name: true } },
              province: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (jobs.length === 0) {
        if (iteration === 0) {
          this.logger.log('No pending Divar posts to normalize.');
        }
        break;
      }

      iteration += 1;
      await this.processJobBatch(jobs as AnalyzeJob[], summary);

      if (jobs.length < batchSize) {
        break;
      }
    }

    return summary;
  }

  private chunkJobs(jobs: AnalyzeJob[]): AnalyzeJob[][] {
    const chunks: AnalyzeJob[][] = [];
    for (let i = 0; i < jobs.length; i += RATE_LIMIT_BATCH_SIZE) {
      chunks.push(jobs.slice(i, i + RATE_LIMIT_BATCH_SIZE));
    }
    return chunks;
  }

  private async processJobBatch(jobs: AnalyzeJob[], summary: ProcessSummary): Promise<void> {
    const chunks = this.chunkJobs(jobs);

    for (const chunk of chunks) {
      const startedAt = Date.now();
      const results = await Promise.all(
        chunk.map(async (job) => {
          try {
            const parsed = this.parser.parse(job.payload);
            await this.persistParsedPost(job, parsed);
            this.logger.log(
              `Post ${job.externalId} normalized (${parsed.cat3 ?? job.readQueue.categorySlug ?? 'unknown'} @ ${
                parsed.citySlug ?? job.readQueue.city?.slug ?? 'n/a'
              }).`,
            );
            return { success: true };
          } catch (error) {
            await this.handleFailure(job, error as Error);
            return { success: false };
          }
        }),
      );

      const chunkSuccess = results.filter((result) => result.success).length;
      summary.processed += chunkSuccess;
      summary.failed += results.length - chunkSuccess;

      const elapsed = Date.now() - startedAt;
      if (elapsed < RATE_LIMIT_INTERVAL_MS) {
        await this.sleep(RATE_LIMIT_INTERVAL_MS - elapsed);
      }
    }
  }

  private async persistParsedPost(job: AnalyzeJob, parsed: ParsedDivarPost): Promise<void> {
    const readQueue = job.readQueue;
    const provinceId = readQueue.provinceId ?? parsed.provinceId ?? null;
    const cityId = readQueue.cityId ?? parsed.cityId ?? null;
    const categorySlug = readQueue.categorySlug ?? parsed.cat3;

    if (!categorySlug) {
      throw new Error(`Missing category slug for post ${job.externalId}`);
    }

    const districtId = await this.resolveDistrictId(parsed.districtSlug, cityId);
    const categoryId = readQueue.categoryId ?? readQueue.category?.id ?? null;
    const provinceName = readQueue.province?.name ?? parsed.provinceName ?? null;
    const cityName = readQueue.city?.name ?? parsed.cityName ?? null;
    const citySlug = parsed.citySlug ?? readQueue.city?.slug ?? null;
    const baseTimestamp = this.resolveBaseTimestamp(job);
    const publishedAt = this.resolvePublishedAt(baseTimestamp, parsed);
    const publishedAtJalali = parsed.publishedAtJalali ?? null;

    const decimal = (value?: number | null): Prisma.Decimal | null => {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return null;
      }

      return new Prisma.Decimal(value);
    };

    const toInt = (value?: number | null): number | null => {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return null;
      }

      return Math.trunc(value);
    };

    await this.prisma.$transaction(async (tx) => {
      const commonData = {
        source: job.source,
        externalId: job.externalId,
        categoryId,
        categorySlug,
        cat1: parsed.cat1 ?? null,
        cat2: parsed.cat2 ?? null,
        cat3: parsed.cat3 ?? categorySlug,
        title: parsed.title ?? null,
        seoTitle: parsed.seoTitle ?? null,
        seoDescription: parsed.seoDescription ?? null,
        displayTitle: parsed.displayTitle ?? null,
        displaySubtitle: parsed.displaySubtitle ?? null,
        shareTitle: parsed.shareTitle ?? null,
        shareUrl: parsed.shareUrl ?? null,
        permalink: parsed.permalink ?? parsed.shareUrl ?? null,
        description: parsed.description ?? null,
        contactUuid: parsed.contactUuid ?? null,
        businessType: parsed.businessType ?? null,
        conversionType: parsed.conversionType ?? null,
        expiresAt: parsed.expiresAt ?? null,
        publishedAt,
        publishedAtJalali,
        status: PostAnalysisStatus.COMPLETED,
        priceTotal: decimal(parsed.priceTotal),
        pricePerSquare: decimal(parsed.pricePerSquare),
        depositAmount: decimal(parsed.depositAmount),
        rentAmount: decimal(parsed.rentAmount),
        dailyRateNormal: decimal(parsed.dailyRateNormal),
        dailyRateWeekend: decimal(parsed.dailyRateWeekend),
        dailyRateHoliday: decimal(parsed.dailyRateHoliday),
        extraPersonFee: decimal(parsed.extraPersonFee),
        area: toInt(parsed.area),
        areaLabel: parsed.areaLabel ?? null,
        landArea: toInt(parsed.landArea),
        landAreaLabel: parsed.landAreaLabel ?? null,
        rooms: toInt(parsed.rooms),
        roomsLabel: parsed.roomsLabel ?? null,
        floor: toInt(parsed.floor),
        floorLabel: parsed.floorLabel ?? null,
        floorsCount: toInt(parsed.floorsCount),
        unitPerFloor: toInt(parsed.unitPerFloor),
        yearBuilt: toInt(parsed.yearBuilt),
        yearBuiltLabel: parsed.yearBuiltLabel ?? null,
        capacity: toInt(parsed.capacity),
        capacityLabel: parsed.capacityLabel ?? null,
        hasParking: parsed.hasParking ?? null,
        hasElevator: parsed.hasElevator ?? null,
        hasWarehouse: parsed.hasWarehouse ?? null,
        hasBalcony: parsed.hasBalcony ?? null,
        isRebuilt: parsed.isRebuilt ?? null,
        photosVerified: parsed.photosVerified ?? null,
        imageCount: parsed.imageCount ?? (parsed.medias.length > 0 ? parsed.medias.length : null),
        latitude: decimal(parsed.latitude),
        longitude: decimal(parsed.longitude),
        provinceId,
        provinceName,
        cityId,
        citySlug,
        cityName,
        districtId,
        districtSlug: parsed.districtSlug ?? null,
        districtName: parsed.districtName ?? null,
        rawPayload: job.payload as Prisma.InputJsonValue,
        updatedAt: new Date(),
      };

      const record = await tx.divarPost.upsert({
        where: { readQueueId: job.readQueueId },
        create: {
          readQueueId: job.readQueueId,
          ...commonData,
        },
        update: commonData,
      });

      await tx.divarPostMedia.deleteMany({ where: { postId: record.id } });
      if (parsed.medias.length > 0) {
        await tx.divarPostMedia.createMany({
          data: parsed.medias.map((media, index) => this.mapMedia(record.id, media, index)),
        });
      }

      await tx.divarPostAttribute.deleteMany({ where: { postId: record.id } });
      if (parsed.attributes.length > 0) {
        await tx.divarPostAttribute.createMany({
          data: parsed.attributes.map((attribute) => this.mapAttribute(record.id, attribute)),
        });
      }

      await tx.postToAnalyzeQueue.update({
        where: { id: job.id },
        data: {
          status: PostAnalysisStatus.COMPLETED,
          retryCount: 0,
          errorMessage: null,
        },
      });
    });
  }

  private mapMedia(postId: string, media: ParsedMedia, fallbackIndex: number) {
    return {
      postId,
      position: media.position ?? fallbackIndex,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl ?? null,
      alt: media.alt ?? null,
    } satisfies Prisma.DivarPostMediaUncheckedCreateInput;
  }

  private mapAttribute(postId: string, attribute: ParsedAttribute) {
    return {
      postId,
      key: attribute.key,
      label: attribute.label ?? null,
      type: attribute.type ?? null,
      stringValue: attribute.stringValue ?? null,
      numberValue:
        attribute.numberValue === null || attribute.numberValue === undefined
          ? null
          : new Prisma.Decimal(attribute.numberValue),
      boolValue: attribute.boolValue ?? null,
      unit: attribute.unit ?? null,
      rawValue: (attribute.rawValue ??
        attribute.stringValue ??
        attribute.numberValue ??
        attribute.boolValue ??
        Prisma.DbNull) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
      createdAt: new Date(),
    } satisfies Prisma.DivarPostAttributeUncheckedCreateInput;
  }

  private resolveBaseTimestamp(job: AnalyzeJob): Date | null {
    return (
      job.readQueue.lastFetchedAt ??
      job.readQueue.updatedAt ??
      job.readQueue.requestedAt ??
      job.readQueue.createdAt ??
      job.createdAt ??
      null
    );
  }

  private resolvePublishedAt(baseTimestamp: Date | null, parsed: ParsedDivarPost): Date | null {
    const relativeMs = parsed.relativePublishMs ?? null;

    if (baseTimestamp && relativeMs !== null && relativeMs < ONE_DAY_MS) {
      return new Date(baseTimestamp.getTime() - relativeMs);
    }

    if (baseTimestamp && relativeMs !== null) {
      return new Date(baseTimestamp.getTime() - relativeMs);
    }

    if (parsed.jalaliGregorianDate) {
      return parsed.jalaliGregorianDate;
    }

    return null;
  }

  private async resolveDistrictId(
    slug?: string | null,
    cityId?: number | null,
  ): Promise<number | null> {
    if (!slug) {
      return null;
    }

    const cacheKey = cityId ? `${slug}:${cityId}` : slug;
    if (this.districtCache.has(cacheKey)) {
      return this.districtCache.get(cacheKey) ?? null;
    }

    const district = await this.prisma.district.findFirst({
      where: {
        slug,
        ...(cityId ? { cityId } : {}),
      },
      select: { id: true },
    });

    const result = district?.id ?? null;
    this.districtCache.set(cacheKey, result);
    return result;
  }

  private async handleFailure(job: PostToAnalyzeQueue, error: Error): Promise<void> {
    const nextRetry = job.retryCount + 1;
    const status =
      nextRetry >= MAX_ANALYZE_ATTEMPTS ? PostAnalysisStatus.FAILED : PostAnalysisStatus.PENDING;

    await this.prisma.postToAnalyzeQueue.update({
      where: { id: job.id },
      data: {
        retryCount: nextRetry,
        status,
        errorMessage: error.message,
      },
    });

    const logMessage = `Post ${job.externalId} normalization failed (attempt ${nextRetry}/${MAX_ANALYZE_ATTEMPTS}): ${error.message}`;
    if (status === PostAnalysisStatus.FAILED) {
      this.logger.error(logMessage, error.stack);
    } else {
      this.logger.warn(logMessage);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
