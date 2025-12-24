import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum NodeEnvironment {
  DEVELOPMENT = 'development',
  TEST = 'test',
  PRODUCTION = 'production',
}

const POSTGRES_SCHEME_REGEX = /^postgres(?:ql)?:\/\//i;

export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.DEVELOPMENT;

  @IsString()
  @IsNotEmpty()
  APP_HOST: string = '0.0.0.0';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  APP_PORT: number = 6200;

  @IsString()
  @IsNotEmpty()
  APP_GLOBAL_PREFIX: string = 'api';

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value))
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  DATABASE_DIRECT_URL?: string;

  @IsOptional()
  @IsString()
  SHADOW_DATABASE_URL?: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string = 'redis';

  @IsOptional()
  @IsString()
  REDIS_HOST_FALLBACK?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6202;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  REDIS_DB: number = 0;

  @IsOptional()
  @IsString()
  REDIS_USERNAME?: string;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : Boolean(value)))
  @IsBoolean()
  REDIS_TLS: boolean = false;

  @IsOptional()
  @IsString()
  REDIS_KEY_PREFIX?: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TOKEN_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_TOKEN_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TOKEN_TTL: string = '900s';

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_TOKEN_TTL: string = '7d';

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  RATE_LIMIT_TTL: number = 60;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  RATE_LIMIT_MAX: number = 100;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_HOST: string = 'rabbitmq';

  @IsString()
  @IsNotEmpty()
  RABBITMQ_URL: string = 'amqp://rabbitmq:6213';
  @IsString()
  @IsNotEmpty()
  RABBITMQ_QUEUE_PREFIX: string = 'my-ads';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  RABBITMQ_PREFETCH: number = 10;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  RABBITMQ_HEARTBEAT: number = 60;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  RABBITMQ_RECONNECT_SECONDS: number = 5;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  RABBITMQ_MAX_CONSUMER_RETRIES: number = 5;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  RABBITMQ_CONSUMER_RETRY_DELAY_MS: number = 500;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_DLQ_SUFFIX: string = 'dead';

  @IsString()
  @IsNotEmpty()
  MINIO_ENDPOINT: string = 'minio';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  MINIO_PORT: number = 6204;

  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : Boolean(value)))
  @IsBoolean()
  MINIO_USE_SSL: boolean = false;

  @IsString()
  @IsNotEmpty()
  MINIO_ACCESS_KEY: string = 'minioadmin';

  @IsString()
  @IsNotEmpty()
  MINIO_SECRET_KEY: string = 'minioadmin';

  @IsString()
  @IsNotEmpty()
  MINIO_BUCKET: string = 'upload';

  @IsOptional()
  @IsString()
  MINIO_REGION?: string;

  @IsOptional()
  @IsString()
  MINIO_PUBLIC_PATH?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : Boolean(value)))
  @IsBoolean()
  MINIO_PUBLIC_READ: boolean = false;

  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : Boolean(value)))
  @IsBoolean()
  OTEL_ENABLED: boolean = false;

  @IsString()
  @IsNotEmpty()
  OTEL_SERVICE_NAME: string = 'my-ads-api';

  @IsOptional()
  @IsString()
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  OTEL_EXPORTER_OTLP_HEADERS?: string;

  @IsOptional()
  @IsString()
  VAPID_PUBLIC_KEY?: string;

  @IsOptional()
  @IsString()
  VAPID_PRIVATE_KEY?: string;

  @IsOptional()
  @IsString()
  VAPID_SUBJECT?: string;

  @IsOptional()
  @IsString()
  @IsIn(['none', 'error', 'warn', 'info', 'debug', 'verbose', 'all'])
  OTEL_LOG_LEVEL?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  LOG_LEVEL: string = 'info';

  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : Boolean(value)))
  @IsBoolean()
  LOG_PRETTY: boolean = false;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  HEALTH_RETRY_ATTEMPTS: number = 3;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  HEALTH_RETRY_BASE_DELAY_MS: number = 150;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  HEALTH_FAILURE_CACHE_MS: number = 5000;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  OTP_TTL_SECONDS: number = 300;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(4)
  @Max(10)
  OTP_DIGITS: number = 6;

  @IsOptional()
  @IsString()
  OTP_SENDER_BASE_URL?: string;

  @IsOptional()
  @IsString()
  OTP_SENDER_API_KEY?: string;

  @IsOptional()
  @IsString()
  DIVAR_SESSION_COOKIE?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @IsPositive()
  DIVAR_HARVEST_MAX_PAGES?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  DIVAR_HARVEST_DELAY_MS?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @IsPositive()
  DIVAR_HARVEST_TIMEOUT_MS?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @IsPositive()
  DIVAR_POST_FETCH_BATCH_SIZE?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),
  )
  @IsInt()
  @IsPositive()
  DIVAR_POST_FETCH_TIMEOUT_MS?: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  NOTIFICATION_WINDOW_MINUTES: number = 10;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  NOTIFICATION_SCAN_BATCH_SIZE: number = 50;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  NOTIFICATION_RETRY_INTERVAL_MS: number = 180000;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  NOTIFICATION_MAX_ATTEMPTS: number = 3;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsPositive()
  NOTIFICATION_RETENTION_DAYS: number = 3;
}

export const validateEnvironment = (config: Record<string, unknown>): EnvironmentVariables => {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  if (!POSTGRES_SCHEME_REGEX.test(validatedConfig.DATABASE_URL)) {
    throw new Error(
      'Environment validation failed:\nDATABASE_URL must be a PostgreSQL connection string',
    );
  }

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors.flatMap((error) => Object.values(error.constraints ?? {})).join('\n');
    throw new Error(`Environment validation failed:\n${messages}`);
  }

  return validatedConfig;
};
