import { registerAs } from '@nestjs/config';

export type CacheConfig = {
  enabled: boolean;
};

export default registerAs<CacheConfig>('cache', () => ({
  enabled: process.env['ENABLE_USE_REDIS_CACHE'] !== 'false',
}));
