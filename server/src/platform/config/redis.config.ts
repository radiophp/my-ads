import { registerAs } from '@nestjs/config';
import { existsSync, readFileSync } from 'node:fs';

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
  const desiredHost = env['REDIS_HOST'];
  const hostFallback = env['REDIS_HOST_FALLBACK'];

  const tlsFlag = env['REDIS_TLS'];
  const tlsEnabled = tlsFlag === 'true' || tlsFlag === '1' || tlsFlag === 'TRUE';

  return {
    host: resolveRedisHost(desiredHost, hostFallback),
    port: Number(env['REDIS_PORT'] ?? 6202),
    db: Number(env['REDIS_DB'] ?? 0),
    tls: tlsEnabled,
    ...(username ? { username } : {}),
    ...(password ? { password } : {}),
    ...(keyPrefix ? { keyPrefix } : {}),
  } satisfies RedisConfig;
});

const runningInContainer = detectContainer();

function resolveRedisHost(host: string | undefined, fallback: string | undefined): string {
  if (!host) {
    return 'localhost';
  }

  if (runningInContainer) {
    return host;
  }

  if (fallback && fallback.length > 0) {
    return fallback;
  }

  return host;
}

function detectContainer(): boolean {
  const override = process.env['RUNNING_IN_DOCKER'];
  if (typeof override === 'string') {
    if (override === '1' || override.toLowerCase() === 'true') {
      return true;
    }
    if (override === '0' || override.toLowerCase() === 'false') {
      return false;
    }
  }

  if (existsSync('/.dockerenv')) {
    return true;
  }

  try {
    const cgroup = readFileSync('/proc/self/cgroup', 'utf8');
    return (
      cgroup.includes('docker') || cgroup.includes('containerd') || cgroup.includes('kubepods')
    );
  } catch {
    return false;
  }
}
