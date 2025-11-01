import { registerAs } from '@nestjs/config';

export type RedisConfig = {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
  tls: boolean;
  keyPrefix?: string;
};

export default registerAs<RedisConfig>('redis', () => {
  const env = process.env;
  const username = env['REDIS_USERNAME'];
  const password = env['REDIS_PASSWORD'];
  const keyPrefix = env['REDIS_KEY_PREFIX'];

  const tlsFlag = env['REDIS_TLS'];
  const tlsEnabled = tlsFlag === 'true' || tlsFlag === '1' || tlsFlag === 'TRUE';

  return {
    host: env['REDIS_HOST'] ?? 'localhost',
    port: Number(env['REDIS_PORT'] ?? 6202),
    db: Number(env['REDIS_DB'] ?? 0),
    tls: tlsEnabled,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    ...(keyPrefix ? { keyPrefix } : {}),
  } satisfies RedisConfig;
});
