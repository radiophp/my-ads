import { registerAs } from '@nestjs/config';
import { CronExpression } from '@nestjs/schedule';

export type SchedulerConfig = {
  divarHarvestCron: string;
  divarFetchCron: string;
  divarAnalyzeCron: string;
  divarMediaSyncCron: string;
  enabled: boolean;
};

const resolveCronExpression = (value: string | undefined, fallback: string): string => {
  if (value && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
};

const schedulerRuntimeConfig = {
  enabled: (process.env['ENABLE_CRON_JOBS'] ?? '').toLowerCase() === 'true',
};

export const schedulerCronExpressions = {
  divarHarvest: resolveCronExpression(
    process.env['DIVAR_HARVEST_CRON'],
    CronExpression.EVERY_10_SECONDS,
  ),
  divarFetch: resolveCronExpression(
    process.env['DIVAR_FETCH_CRON'],
    CronExpression.EVERY_10_SECONDS,
  ),
  divarAnalyze: resolveCronExpression(
    process.env['DIVAR_ANALYZE_CRON'],
    CronExpression.EVERY_10_SECONDS,
  ),
  divarMediaSync: resolveCronExpression(
    process.env['DIVAR_MEDIA_SYNC_CRON'],
    CronExpression.EVERY_10_SECONDS,
  ),
} satisfies Record<string, string>;

export default registerAs(
  'scheduler',
  (): SchedulerConfig => ({
    divarHarvestCron: schedulerCronExpressions.divarHarvest,
    divarFetchCron: schedulerCronExpressions.divarFetch,
    divarAnalyzeCron: schedulerCronExpressions.divarAnalyze,
    divarMediaSyncCron: schedulerCronExpressions.divarMediaSync,
    enabled: schedulerRuntimeConfig.enabled,
  }),
);
