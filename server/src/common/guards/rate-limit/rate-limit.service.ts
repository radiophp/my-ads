import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@app/platform/cache/redis.service';
import { RateLimitOptions } from '../../decorators/rate-limit.decorator';
import type { SecurityConfig } from '@app/platform/config/security.config';

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async checkRateLimit(
    key: string,
    options?: RateLimitOptions,
  ): Promise<{ remaining: number; limit: number; ttl: number }> {
    const securityConfig = this.configService.get<SecurityConfig['rateLimit']>(
      'security.rateLimit',
      { infer: true },
    );
    const limit = options?.limit ?? securityConfig?.limit ?? 100;
    const ttlSeconds = options?.ttlSeconds ?? securityConfig?.ttlSeconds ?? 60;

    const redisKey = `rate-limit:${key}`;

    const usage = await this.redisService.incr(redisKey);
    if (usage === 1) {
      await this.redisService.expire(redisKey, ttlSeconds);
    }

    const ttlMs = await this.redisService.pTTL(redisKey);
    let remainingTtlSeconds: number;

    if (ttlMs > 0) {
      remainingTtlSeconds = Math.ceil(ttlMs / 1000);
    } else if (ttlMs === -1) {
      this.logger.warn(`Rate limit key ${redisKey} lost its TTL; restoring to ${ttlSeconds}s.`);
      await this.redisService.expire(redisKey, ttlSeconds);
      remainingTtlSeconds = ttlSeconds;
    } else {
      this.logger.warn(
        `Rate limit key ${redisKey} missing or expired; reapplying TTL ${ttlSeconds}s.`,
      );
      remainingTtlSeconds = ttlSeconds;
    }

    if (usage > limit) {
      return { remaining: 0, limit, ttl: remainingTtlSeconds };
    }

    const remaining = Math.max(limit - usage, 0);
    return { remaining, limit, ttl: remainingTtlSeconds };
  }
}
