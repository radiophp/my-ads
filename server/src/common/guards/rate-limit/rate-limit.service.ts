import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@app/platform/cache/redis.service';
import { RateLimitOptions } from '../../decorators/rate-limit.decorator';
import type { SecurityConfig } from '@app/platform/config/security.config';

const RATE_LIMIT_LUA_SCRIPT = `
  local current = redis.call("INCR", KEYS[1])
  if current == 1 then
    redis.call("PEXPIRE", KEYS[1], ARGV[1])
  end
  local ttl = redis.call("PTTL", KEYS[1])
  return { current, ttl }
`;

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

    let usage: number;
    let ttlMs: number;

    if (typeof this.redisService.eval === 'function') {
      const ttlMsTarget = ttlSeconds * 1000;
      const [usageRaw, ttlRaw] = await this.redisService.eval<[number, number]>(
        RATE_LIMIT_LUA_SCRIPT,
        [redisKey],
        [ttlMsTarget],
      );
      usage = Number(usageRaw);
      ttlMs = Number(ttlRaw);
    } else {
      usage = await this.redisService.incr(redisKey);
      if (usage === 1) {
        await this.redisService.expire(redisKey, ttlSeconds);
      }
      ttlMs = await this.redisService.pTTL(redisKey);
    }

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
