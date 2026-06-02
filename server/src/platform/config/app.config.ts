import { registerAs } from '@nestjs/config';

export type AppConfig = {
  env: string;
  host: string;
  port: number;
  globalPrefix: string;
};

export default registerAs<AppConfig>('app', () => {
  const env = process.env;
  const portSource = env['APP_PORT'] ?? env['PORT'];

  return {
    env: env['NODE_ENV'] ?? 'development',
    host: env['APP_HOST'] ?? '0.0.0.0',
    port: portSource ? Number(portSource) : 6200,
    globalPrefix: env['APP_GLOBAL_PREFIX'] ?? 'api',
  } satisfies AppConfig;
});
