import { registerAs } from '@nestjs/config';

export type NotificationsConfig = {
  scanWindowMinutes: number;
  scanBatchSize: number;
  retryIntervalMs: number;
  maxDeliveryAttempts: number;
  retentionDays: number;
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

export default registerAs(
  'notifications',
  (): NotificationsConfig => ({
    scanWindowMinutes: toNumber(process.env['NOTIFICATION_WINDOW_MINUTES'], 10),
    scanBatchSize: toNumber(process.env['NOTIFICATION_SCAN_BATCH_SIZE'], 50),
    retryIntervalMs: toNumber(process.env['NOTIFICATION_RETRY_INTERVAL_MS'], 180000),
    maxDeliveryAttempts: toNumber(process.env['NOTIFICATION_MAX_ATTEMPTS'], 3),
    retentionDays: toNumber(process.env['NOTIFICATION_RETENTION_DAYS'], 3),
  }),
);
