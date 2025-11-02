import { registerAs } from '@nestjs/config';

export type HealthConfig = {
  retryAttempts: number;
  baseDelayMs: number;
  failureCacheMs: number;
};

const toPositiveNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default registerAs<HealthConfig>('health', () => {
  const env = process.env;

  return {
    retryAttempts: toPositiveNumber(env['HEALTH_RETRY_ATTEMPTS'], 3),
    baseDelayMs: toPositiveNumber(env['HEALTH_RETRY_BASE_DELAY_MS'], 150),
    failureCacheMs: toPositiveNumber(env['HEALTH_FAILURE_CACHE_MS'], 5000),
  } satisfies HealthConfig;
});
