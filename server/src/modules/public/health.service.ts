import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PrismaService } from '@app/platform/database/prisma.service';
import { RedisService } from '@app/platform/cache/redis.service';
import { QueueService } from '@app/platform/queue/queue.service';
import { StorageService } from '@app/platform/storage/storage.service';
import { MetricsService } from '@app/platform/metrics/metrics.service';
import healthConfig from '@app/platform/config/health.config';

export type DependencyStatus = {
  status: 'up' | 'down';
  latencyMs: number;
  error?: string;
};

export type HealthReport = {
  database: DependencyStatus;
  redis: DependencyStatus;
  rabbitmq: DependencyStatus;
  storage: DependencyStatus;
};

@Injectable()
export class PublicHealthService {
  private readonly logger = new Logger(PublicHealthService.name);
  private readonly failureCache = new Map<
    string,
    { status: DependencyStatus; expiresAt: number }
  >();

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly queueService: QueueService,
    private readonly storageService: StorageService,
    private readonly metricsService: MetricsService,
    @Inject(healthConfig.KEY) private readonly config: ConfigType<typeof healthConfig>,
  ) {}

  async check(): Promise<HealthReport> {
    const [database, redis, rabbitmq, storage] = await Promise.all([
      this.measure(async () => {
        await this.prismaService.$queryRaw`SELECT 1`;
      }, 'database'),
      this.measure(async () => {
        await this.redisService.ping();
      }, 'redis'),
      this.measure(async () => {
        await this.queueService.healthCheck();
      }, 'rabbitmq'),
      this.measure(async () => {
        await this.storageService.healthCheck();
      }, 'storage'),
    ]);

    return {
      database,
      redis,
      rabbitmq,
      storage,
    };
  }

  private async measure(task: () => Promise<void>, component: string): Promise<DependencyStatus> {
    const maxAttempts = this.config.retryAttempts;
    const baseDelayMs = this.config.baseDelayMs;

    const cached = this.failureCache.get(component);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`Returning cached failure for ${component}`);
      return { ...cached.status };
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptStart = process.hrtime.bigint();
      try {
        await task();
        const latencyMs = Number(process.hrtime.bigint() - attemptStart) / 1_000_000;
        if (attempt > 1) {
          this.logger.warn(`Health check for ${component} succeeded after retry ${attempt - 1}.`);
        }
        this.metricsService.recordHealthCheck(component, 'up', latencyMs);
        if (this.failureCache.has(component)) {
          this.failureCache.delete(component);
        }
        return {
          status: 'up',
          latencyMs: Number(latencyMs.toFixed(2)),
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const latencyMs = Number(process.hrtime.bigint() - attemptStart) / 1_000_000;

        if (attempt === maxAttempts) {
          this.logger.error(
            `Health check failed for ${component} (attempt ${attempt}/${maxAttempts})`,
            err.stack ?? err.message,
          );
          this.metricsService.recordHealthCheck(component, 'down', latencyMs);
          const status: DependencyStatus = {
            status: 'down',
            latencyMs: Number(latencyMs.toFixed(2)),
            error: err.message,
          };
          this.failureCache.set(component, {
            status,
            expiresAt: Date.now() + this.config.failureCacheMs,
          });
          return status;
        }

        this.logger.warn(
          `Health check failed for ${component} (attempt ${attempt}/${maxAttempts}): ${err.message}`,
        );

        const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), 1000);
        await this.delay(delayMs);
      }
    }

    return {
      status: 'down',
      latencyMs: 0,
      error: 'Unknown error',
    };
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
