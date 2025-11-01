import { registerAs } from '@nestjs/config';

export type RabbitMQConfig = {
  url: string;
  queuePrefix: string;
  prefetch: number;
  heartbeat: number;
  reconnect: number;
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default registerAs<RabbitMQConfig>('rabbitmq', () => {
  const env = process.env;

  const host = env['RABBITMQ_HOST'] ?? 'rabbitmq';
  const port = Number(env['RABBITMQ_PORT'] ?? 6213);

  return {
    url: env['RABBITMQ_URL'] ?? `amqp://${host}:${port}`,
    queuePrefix: env['RABBITMQ_QUEUE_PREFIX'] ?? 'my-ads',
    prefetch: toNumber(env['RABBITMQ_PREFETCH'], 10),
    heartbeat: toNumber(env['RABBITMQ_HEARTBEAT'], 60),
    reconnect: toNumber(env['RABBITMQ_RECONNECT_SECONDS'], 5),
  } satisfies RabbitMQConfig;
});
