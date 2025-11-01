import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@app/platform/cache/redis.service';
import { RateLimitOptions } from '../../decorators/rate-limit.decorator';
import type { SecurityConfig } from '@app/platform/config/security.config';

@Injectable()
export class RateLimitService {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async checkRateLimit(
    key: string,
    options?: RateLimitOptions,
  ): Promise<{ remaining: number; limit: number; ttl: number }>
  {
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

    if (usage > limit) {
      return { remaining: 0, limit, ttl: ttlSeconds };
    }

    const remaining = Math.max(limit - usage, 0);
    return { remaining, limit, ttl: ttlSeconds };
  }
}
