import { SetMetadata } from '@nestjs/common';

export type RateLimitOptions = {
  limit: number;
  ttlSeconds?: number;
};

export const RATE_LIMIT_KEY = 'rate-limit';

export const RateLimit = (options: RateLimitOptions): ReturnType<typeof SetMetadata> =>
  SetMetadata(RATE_LIMIT_KEY, options);
