import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Prisma, DivarPostMedia } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { StorageService } from '@app/platform/storage/storage.service';
import { schedulerCronExpressions } from '@app/platform/config/scheduler.config';

const MEDIA_BATCH_SIZE = 25;
const RATE_LIMIT_DELAY_MS = 500;
const MAX_DOWNLOAD_ATTEMPTS = 5;

@Injectable()
export class DivarPostMediaSyncService {
  private readonly logger = new Logger(DivarPostMediaSyncService.name);
  private readonly schedulerEnabled: boolean;
  private syncRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    configService: ConfigService,
  ) {
    this.schedulerEnabled = configService.get<boolean>('scheduler.enabled') ?? false;
  }

  @Cron(schedulerCronExpressions.divarMediaSync, {
    name: 'divar-post-media-sync',
  })
  async scheduledSync(): Promise<void> {
    if (!this.schedulerEnabled) {
      return;
    }
    if (this.syncRunning) {
      this.logger.warn('Media sync already running; skipping this tick.');
      return;
    }

    this.syncRunning = true;
    try {
      await this.syncNextBatch();
    } catch (error) {
      this.logger.error('Media sync failed', error instanceof Error ? error.stack : String(error));
    } finally {
      this.syncRunning = false;
    }
  }

  async syncNextBatch(): Promise<void> {
    let totalProcessed = 0;

    while (true) {
      const medias = await this.prisma.divarPostMedia.findMany({
        where: {
          OR: [
            {
              localUrl: { equals: null },
              url: { contains: 'divarcdn.com' },
            },
            {
              localThumbnailUrl: { equals: null },
              thumbnailUrl: { contains: 'divarcdn.com' },
            },
          ],
        },
        orderBy: { updatedAt: 'asc' },
        take: MEDIA_BATCH_SIZE,
      });

      if (medias.length === 0) {
        break;
      }

      this.logger.log(
        `Processing Divar media batch (${medias.length} items, total processed ${totalProcessed}).`,
      );

      for (const media of medias) {
        await this.syncSingleMedia(media).catch((error) => {
          this.logger.warn(
            `Failed to sync media ${media.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        });
        totalProcessed += 1;
        await this.sleep(RATE_LIMIT_DELAY_MS);
      }

      this.logger.log(
        `Batch complete. Total processed so far: ${totalProcessed}. Continuing if more media remain...`,
      );

      if (medias.length < MEDIA_BATCH_SIZE) {
        break;
      }
    }

    if (totalProcessed === 0) {
      this.logger.debug('No Divar media pending sync.');
    } else {
      this.logger.log(`Divar media sync processed ${totalProcessed} items.`);
    }
  }

  private async syncSingleMedia(media: DivarPostMedia): Promise<void> {
    const updates: Prisma.DivarPostMediaUpdateInput = {};

    if (this.shouldMirrorUrl(media.url, media.localUrl)) {
      const result = await this.downloadAndStore(media.url as string);
      if (result) {
        updates.localUrl = result;
      }
    }

    if (this.shouldMirrorUrl(media.thumbnailUrl, media.localThumbnailUrl)) {
      const result = await this.downloadAndStore(media.thumbnailUrl as string);
      if (result) {
        updates.localThumbnailUrl = result;
      }
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    await this.prisma.divarPostMedia.update({
      where: { id: media.id },
      data: updates,
    });
  }

  private shouldMirrorUrl(remote?: string | null, local?: string | null): boolean {
    if (local || !remote) {
      return false;
    }
    try {
      const parsed = new URL(remote);
      return parsed.hostname.endsWith('divarcdn.com');
    } catch {
      return false;
    }
  }

  private async downloadAndStore(remoteUrl: string): Promise<string | null> {
    const key = this.buildObjectKey(remoteUrl);
    if (!key) {
      return null;
    }

    const payload = await this.fetchWithRetry(remoteUrl);
    if (!payload) {
      return null;
    }

    const result = await this.storageService.uploadObject({
      key,
      body: payload.buffer,
      contentType: payload.contentType,
      contentLength: payload.buffer.length,
    });
    return result.url;
  }

  private async fetchWithRetry(
    remoteUrl: string,
  ): Promise<{ buffer: Buffer; contentType?: string } | null> {
    for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(remoteUrl);
        if (!response.ok) {
          if (response.status === 404) {
            this.logger.warn(`Remote media not found (404): ${remoteUrl}`);
            return null;
          }
          throw new Error(`Unexpected response ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return {
          buffer: Buffer.from(arrayBuffer),
          contentType: response.headers.get('content-type') ?? this.guessContentType(remoteUrl),
        };
      } catch (error) {
        if (attempt >= MAX_DOWNLOAD_ATTEMPTS) {
          throw error;
        }
        const delay = RATE_LIMIT_DELAY_MS * attempt;
        await this.sleep(delay);
      }
    }
    return null;
  }

  private buildObjectKey(remoteUrl: string): string | null {
    try {
      const parsed = new URL(remoteUrl);
      const pathname = parsed.pathname.replace(/^\/+/, '');
      if (!pathname) {
        return null;
      }
      return pathname;
    } catch {
      return null;
    }
  }

  private guessContentType(url: string): string {
    const lower = url.toLowerCase();
    if (lower.endsWith('.webp')) {
      return 'image/webp';
    }
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      return 'image/jpeg';
    }
    if (lower.endsWith('.png')) {
      return 'image/png';
    }
    return 'application/octet-stream';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
