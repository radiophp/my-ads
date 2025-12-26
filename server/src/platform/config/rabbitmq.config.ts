import { registerAs } from '@nestjs/config';

export type RabbitMQConfig = {
  url: string;
  queuePrefix: string;
  prefetch: number;
  heartbeat: number;
  reconnect: number;
  maxConsumerRetries: number;
  consumerRetryDelayMs: number;
  deadLetterQueueSuffix: string;
  managementUrl: string | null;
  managementUser: string;
  managementPassword: string;
  managementTimeoutMs: number;
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default registerAs<RabbitMQConfig>('rabbitmq', () => {
  const env = process.env;

  const host = env['RABBITMQ_HOST'] ?? 'rabbitmq';
  const port = Number(env['RABBITMQ_PORT'] ?? 6213);
  const managementPort = env['RABBITMQ_MANAGEMENT_PORT'];
  const managementUrl =
    env['RABBITMQ_MANAGEMENT_URL'] ?? (managementPort ? `http://${host}:${managementPort}` : null);

  return {
    url: env['RABBITMQ_URL'] ?? `amqp://${host}:${port}`,
    queuePrefix: env['RABBITMQ_QUEUE_PREFIX'] ?? 'my-ads',
    prefetch: toNumber(env['RABBITMQ_PREFETCH'], 5),
    heartbeat: toNumber(env['RABBITMQ_HEARTBEAT'], 60),
    reconnect: toNumber(env['RABBITMQ_RECONNECT_SECONDS'], 5),
    maxConsumerRetries: toNumber(env['RABBITMQ_MAX_CONSUMER_RETRIES'], 5),
    consumerRetryDelayMs: toNumber(env['RABBITMQ_CONSUMER_RETRY_DELAY_MS'], 500),
    deadLetterQueueSuffix: env['RABBITMQ_DLQ_SUFFIX'] ?? 'dead',
    managementUrl,
    managementUser: env['RABBITMQ_MANAGEMENT_USERNAME'] ?? env['RABBITMQ_USERNAME'] ?? 'guest',
    managementPassword: env['RABBITMQ_MANAGEMENT_PASSWORD'] ?? env['RABBITMQ_PASSWORD'] ?? 'guest',
    managementTimeoutMs: toNumber(env['RABBITMQ_MANAGEMENT_TIMEOUT_MS'], 3000),
  } satisfies RabbitMQConfig;
});
